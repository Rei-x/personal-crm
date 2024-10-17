FROM node:23-slim AS base

# Install curl, wget, and font dependencies
RUN apt update && \
    apt install -y curl wget fontconfig fonts-liberation && \
    rm -rf /var/lib/apt/lists/*

# Configure font cache
RUN fc-cache -f -v

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
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
COPY --from=build /app/build /app/build
EXPOSE 3000
CMD [ "pnpm", "start" ]
