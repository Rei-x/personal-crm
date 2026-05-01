FROM node:20-slim AS base

# Install curl, wget, font and canvas runtime dependencies
RUN apt update && \
    apt install -y curl wget fontconfig fonts-liberation \
        libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
        libjpeg62-turbo libgif7 librsvg2-2 && \
    rm -rf /var/lib/apt/lists/*

# Configure font cache
RUN fc-cache -f -v

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN npm install -g corepack@latest && corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD [ "pnpm", "start" ]
