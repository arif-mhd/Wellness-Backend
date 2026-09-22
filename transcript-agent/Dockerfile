# node:20-alpine (musl libc) will NOT work here — @livekit/rtc-node depends
# on @livekit/rtc-ffi-bindings, a native (Rust/napi) addon that only ships
# glibc prebuilt binaries (linux-x64-gnu / linux-arm64-gnu, no -musl variant).
# node:20-slim is Debian-based (glibc), which is what makes the native
# binary actually load instead of failing at runtime.
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-slim

# The Rust engine inside @livekit/rtc-node reads the OS trust store directly
# rather than Node's bundled CAs, and node:20-slim ships without one — so
# every outbound TLS connection fails with "no native root CA certificates
# found" and the agent dies the moment it's dispatched to a room. It works on
# a dev machine only because the host already has a trust store.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "dist/index.js", "start"]
