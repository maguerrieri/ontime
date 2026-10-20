ARG NODE_VERSION=22.22.2
FROM node:${NODE_VERSION}-alpine

# Trust a pinned CA bundle instead of the one built into Node, which still includes the compromised eMudhra CAs
# Alpine's fixed ca-certificates-bundle is not yet built for every platform we target, so use curl's extract
# Its directory is also SSL_CERT_DIR, so OpenSSL's hashed-directory lookup can't pick up the old store
# Drop this once the Node base image ships the fix (#17)
ADD --chmod=644 --checksum=sha256:796f1389bfea13c0ed78f663b765baaff54a508e5483786bd6ece73c5e3e3cbe \
    https://curl.se/ca/cacert-2026-10-20.pem /etc/ssl/pinned/cacert-2026-10-20.pem
ENV SSL_CERT_FILE=/etc/ssl/pinned/cacert-2026-10-20.pem
ENV SSL_CERT_DIR=/etc/ssl/pinned
ENV NODE_OPTIONS="--use-openssl-ca${NODE_OPTIONS:+ $NODE_OPTIONS}"

# Set environment variables
# Environment Variable to signal that we are running production
ENV NODE_ENV=docker
# Ontime Data path
ENV ONTIME_DATA=/data/

RUN mkdir /app
WORKDIR /app/

# Prepare UI
COPY apps/client/build/ ./client/

# Prepare Backend
COPY apps/server/dist/ ./server/
COPY apps/server/src/external/ ./external/
COPY apps/server/src/user/ ./user/
COPY apps/server/src/html/ ./html/

# Export default ports
EXPOSE 4001/tcp 8888/udp 9999/udp

# Repeat --use-openssl-ca so a NODE_OPTIONS set at runtime can't drop it
CMD ["node", "--use-openssl-ca", "server/docker.cjs"]

# Build and run commands
# pnpm build:docker
# docker buildx build . -t getontime/ontime
# docker run -p 4001:4001 -p 8888:8888/udp -p 9999:9999/udp -v ./ontime-db:/data/ getontime/ontime
