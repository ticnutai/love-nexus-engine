# Go API — Multi-stage build
FROM golang:1.22-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /zahauton-api .

# Runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /zahauton-api /usr/local/bin/zahauton-api
EXPOSE 8080
CMD ["zahauton-api"]
