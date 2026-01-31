import { describe, expect, test } from "vitest";
import { getEanInfo } from "./ean";

describe("EAN", () => {
  test("should return true for a valid EAN", async () => {
    const product = await getEanInfo("5900094257807");

    expect(product).toMatchInlineSnapshot(`
      {
        "brand": "Be Happy",
        "categoryDetails": [
          {
            "code": "10002121",
            "text": "Półki/ stojaki/ pojemniki/ dozowniki przechowywania w kuchni",
          },
        ],
        "company": {
          "city": "Łódź, PL",
          "name": "Be Happy János Vandzsurák",
          "nip": "6751510615",
          "postalCode": "91-341",
          "street": "ul. Brukowa 6/8 lok. 57/58",
          "webPage": "http://www.be-happygifts.com",
        },
        "description": null,
        "descriptionLanguage": "pl",
        "gs1Licence": {
          "licenseeGLN": "5909000838505",
          "licensingMO": {
            "moName": "GS1 Poland",
          },
        },
        "gtinNumber": "05900094257807",
        "gtinStatus": "active",
        "imageUrls": [],
        "isComplete": false,
        "isGlobal": true,
        "isPublic": true,
        "isVerified": true,
        "lastModified": 2024-07-16T12:02:11.700Z,
        "name": "Be Happy Słoik szklany z czerwoną etykietą 950ml",
        "netContent": [
          "1 szt (sztuka)",
        ],
        "netVolume": "1",
        "productPage": null,
        "source": "global",
        "targetMarket": [
          "PL",
        ],
        "unit": "szt (sztuka)",
      }
    `);
  });

  test("should return undefined for an invalid EAN", async () => {
    const product = await getEanInfo("5900094257808");

    expect(product).toBeUndefined();
  });
});
