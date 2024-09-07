import { chromium, Browser, Page } from "playwright";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import qs from "qs";
import { CouponsV1Schema } from "./couponsv1";
import { CouponsListSchema } from "./coupons";
import { ReceiptOneSchema } from "./receipt";
import { ReceiptListSchema } from "./receiptList";
import { LotteryOneSchema } from "./lotteryOne";
import { z } from "zod";
import { PromotionCards } from "./promotionCards";
import fs from "fs";
import { CouponsV2Schema } from "./couponsv2";

export class LidlPlusApi {
  private static readonly CLIENT_ID = "LidlPlusNativeClient";
  private static readonly AUTH_API = "https://accounts.lidl.com";
  private static readonly TICKET_API = "https://tickets.lidlplus.com/api/v2";
  private static readonly COUPONS_API = "https://coupons.lidlplus.com/api";
  private static readonly LOTTERIES_API =
    "https://purchaselottery.lidlplus.com/api";
  private static readonly COUPONS_V1_API =
    "https://coupons.lidlplus.com/app/api/";
  private static readonly PROFILE_API =
    "https://profile.lidlplus.com/profile/api";
  private static readonly APP = "com.lidl.eci.lidlplus";
  private static readonly OS = "Android";
  private static readonly TIMEOUT = 10000;

  private loginUrl = "";
  private codeVerifier = "";
  refreshToken = "";
  private expires: Date | null = null;
  private token = "";
  private country: string;
  private language: string;

  constructor(language: string, country: string, refreshToken = "") {
    this.country = country.toUpperCase();
    this.language = language.toLowerCase();
    this.refreshToken = refreshToken;
  }

  private async registerOauthClient(): Promise<string> {
    if (this.loginUrl) {
      return this.loginUrl;
    }

    const codeVerifier = uuidv4();
    this.codeVerifier = codeVerifier;

    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const params = new URLSearchParams({
      client_id: LidlPlusApi.CLIENT_ID,
      response_type: "code",
      scope: "openid profile offline_access lpprofile lpapis",
      redirect_uri: `${LidlPlusApi.APP}://callback`,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      Country: this.country,
      language: `${this.language}-${this.country}`,
    });

    this.loginUrl = `${
      LidlPlusApi.AUTH_API
    }/connect/authorize?${params.toString()}`;
    return this.loginUrl;
  }

  private async initBrowser(headless = true): Promise<Browser> {
    return await chromium.launch({ headless });
  }

  private async auth(payload: Record<string, string>): Promise<void> {
    const defaultSecret = Buffer.from(
      `${LidlPlusApi.CLIENT_ID}:secret`
    ).toString("base64");
    const headers = {
      Authorization: `Basic ${defaultSecret}`,
      "content-type": "application/x-www-form-urlencoded",
    };

    const response = await axios.post(
      `${LidlPlusApi.AUTH_API}/connect/token`,
      qs.stringify(payload),
      {
        headers,
        timeout: LidlPlusApi.TIMEOUT,
        validateStatus: (status) => status < 500,
      }
    );

    const data = response.data;
    this.expires = new Date(Date.now() + data.expires_in * 1000);
    this.token = data.access_token;
    this.refreshToken = data.refresh_token;
  }

  private async renewToken(): Promise<void> {
    const payload = {
      refresh_token: this.refreshToken,
      grant_type: "refresh_token",
    };
    await this.auth(payload);
  }

  private async authorizationCode(code: string): Promise<void> {
    const payload = {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: `${LidlPlusApi.APP}://callback`,
      code_verifier: this.codeVerifier,
    };
    await this.auth(payload);
  }

  private async acceptLegalTerms(page: Page, accept = true): Promise<void> {
    await page.click("#checkbox_Accepted");
    if (!accept) {
      const title = await page.$eval("h2", (el) => el.textContent);
      throw new Error(`Legal terms not accepted: ${title}`);
    }
    await page.click("button");
  }

  private async parseCode(
    page: Page,
    acceptLegalTerms = true
  ): Promise<string> {
    const response = await page.waitForResponse(
      (response) =>
        response.url().includes(`${LidlPlusApi.AUTH_API}/connect`) &&
        response.status() === 302
    );
    const location = response.headers()["location"] || "";

    if (location.includes("legalTerms")) {
      await this.acceptLegalTerms(page, acceptLegalTerms);
      return this.parseCode(page, false);
    }

    const codeMatch = location.match(/code=([0-9A-F]+)/);

    return codeMatch ? codeMatch[1] : "";
  }

  private async checkInputError(page: Page): Promise<void> {
    const errors = await page.$$(".input-error-message");
    for (const error of errors) {
      const errorText = await error.textContent();
      if (errorText) {
        throw new Error(`Login error: ${errorText}`);
      }
    }
  }

  private async checkLoginError(page: Page): Promise<void> {
    const response = await page.waitForResponse((response) =>
      response.url().includes(`${LidlPlusApi.AUTH_API}/Account/Login`)
    );
    if (response.status() <= 400) {
      return;
    }
    const body = await response.text();
    const errorMatch = body.match(/app-errors="\\{[^:]*?:.(.*?).}/);
    if (errorMatch) {
      throw new Error(`Login error: ${errorMatch[1]}`);
    }
  }

  private async check2faAuth(
    page: Page,
    verifyMode: "phone" | "email" = "phone",
    verifyTokenFunc?: () => Promise<string>
  ): Promise<void> {
    const response = await page.waitForResponse((response) =>
      response.url().includes(`${LidlPlusApi.AUTH_API}/Account/Login`)
    );
    if (
      !response.headers()["location"]?.includes("/connect/authorize/callback")
    ) {
      await page.click(`${verifyMode} button`);
      if (verifyTokenFunc) {
        const verifyCode = await verifyTokenFunc();
        await page.fill('input[name="VerificationCode"]', verifyCode);
        await page.click(".role_next");
      }
    }
  }

  async login(
    phone: string,
    password: string,
    options: {
      headless?: boolean;
      verifyMode?: "phone" | "email";
      verifyTokenFunc?: () => Promise<string>;
      acceptLegalTerms?: boolean;
    } = {}
  ): Promise<void> {
    const browser = await this.initBrowser(options.headless);
    const page = await browser.newPage();

    await page.goto(await this.registerOauthClient());

    await page.click("#button_welcome_login");
    await page.fill('input[name="EmailOrPhone"]', phone);
    await page.click("#button_btn_submit_email");
    await page.click("#button_btn_submit_email");

    await page.fill("#field_Password", password);
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    await page.click("#button_submit");

    // await new Promise((resolve) => setTimeout(resolve, 100000));
    // await this.checkLoginError(page);
    // await this.check2faAuth(page, options.verifyMode, options.verifyTokenFunc);

    const code = await this.parseCode(page, options.acceptLegalTerms);

    await this.authorizationCode(code);

    await browser.close();
  }

  private async getDefaultHeaders(): Promise<Record<string, string>> {
    if (
      (!this.token && this.refreshToken) ||
      (this.expires && new Date() >= this.expires)
    ) {
      await this.renewToken();
    }
    if (!this.token) {
      throw new Error("You need to login!");
    }
    return {
      Authorization: `Bearer ${this.token}`,
      "App-Version": "16.11.3",
      Model: "sdk_gphone64_x86_64",
      "Operating-System": LidlPlusApi.OS,
      App: "com.lidl.eci.lidl.plus",
      "User-Agent": "okhttp/4.12.0",
      "Accept-Language": this.language,
      Source: "C",
    };
  }

  async receipts(onlyFavorite = false) {
    const url = `${LidlPlusApi.TICKET_API}/${this.country}/tickets`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(
      `${url}?pageNumber=1&onlyFavorite=${onlyFavorite}`,
      {
        headers,
        timeout: LidlPlusApi.TIMEOUT,
      }
    );

    let tickets = response.data.tickets;
    const totalPages = Math.ceil(response.data.totalCount / response.data.size);

    for (let i = 2; i <= totalPages; i++) {
      const pageResponse = await axios.get(`${url}?pageNumber=${i}`, {
        headers,
        timeout: LidlPlusApi.TIMEOUT,
      });
      tickets = tickets.concat(pageResponse.data.tickets);
    }

    return ReceiptListSchema.parse(tickets);
  }

  async receipt(ticketId: string) {
    const url = `${LidlPlusApi.TICKET_API}/${this.country}/tickets/${ticketId}`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });

    return ReceiptOneSchema.parse(response.data);
  }

  async couponPromotionsV2() {
    const url = `${LidlPlusApi.COUPONS_V1_API}/v2/promotionslist`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(url, {
      headers: {
        ...headers,
        Country: this.country,
      },
      timeout: LidlPlusApi.TIMEOUT,
    });

    return CouponsV2Schema.parse(response.data);
  }

  async couponPromotionsV1() {
    const url = `${LidlPlusApi.COUPONS_V1_API}/v1/promotionslist`;
    const headers = {
      ...(await this.getDefaultHeaders()),
      Country: this.country,
    };

    const response = await axios.get(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });

    return CouponsV1Schema.parse(response.data);
  }

  async activateCouponPromotionV1(promotionId: string, source: string) {
    const url = `${LidlPlusApi.COUPONS_V1_API}v1/promotions/${promotionId}/activation`;
    const headers = {
      ...(await this.getDefaultHeaders()),
      Country: this.country,
      Source: source,
    };

    await axios.post(url, null, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });
  }

  async deactiveCouponPromotionV1(promotionId: string, source: string) {
    const url = `${LidlPlusApi.COUPONS_V1_API}/v1/promotions/${promotionId}/activation`;
    const headers = {
      ...(await this.getDefaultHeaders()),
      Country: this.country,
      Source: source,
    };

    await axios.delete(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });
  }

  async coupons() {
    const url = `${LidlPlusApi.COUPONS_API}/v2/${this.country}`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });

    fs.writeFileSync("coupons.json", JSON.stringify(response.data));

    return CouponsListSchema.parse(response.data);
  }

  async promotionCards(promotionId: string) {
    const url = `${LidlPlusApi.COUPONS_V1_API}/v1/promotions/cards?ids=${promotionId}`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });

    return PromotionCards.parse(response.data);
  }

  async activateCoupon(couponId: string) {
    const url = `${LidlPlusApi.COUPONS_API}/v1/${this.country}/${couponId}/activation`;
    const headers = await this.getDefaultHeaders();

    await axios.post(url, null, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });
  }

  async deactivateCoupon(couponId: string) {
    const url = `${LidlPlusApi.COUPONS_API}/v1/${this.country}/${couponId}/activation`;
    const headers = await this.getDefaultHeaders();

    await axios.delete(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });
  }

  async lotterie(lotteryId: string) {
    const url = `${LidlPlusApi.LOTTERIES_API}/v1/${this.country}/lotteries/${lotteryId}`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });

    return LotteryOneSchema.parse(response.data);
  }

  async redeemLottery(lotteryId: string) {
    const url = `${LidlPlusApi.LOTTERIES_API}/v1/${this.country}/lotteries/${lotteryId}/redeemed`;
    const headers = await this.getDefaultHeaders();

    await axios.patch(url, null, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });
  }

  async lotteryStatus(lotteryId: string) {
    const url = `${LidlPlusApi.LOTTERIES_API}/v1/${this.country}/lotteries/${lotteryId}/redeemed/status`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });

    return z.string().parse(response.data);
  }

  async loyaltyId(): Promise<string> {
    const url = `${LidlPlusApi.PROFILE_API}/v1/${this.country}/loyalty`;
    const headers = await this.getDefaultHeaders();

    const response = await axios.get(url, {
      headers,
      timeout: LidlPlusApi.TIMEOUT,
    });

    return response.data;
  }
}
