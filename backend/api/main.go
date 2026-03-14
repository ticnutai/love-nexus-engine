package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"zahauton-api/cache"
	"zahauton-api/handlers"
)

func main() {
	_ = godotenv.Load()

	// PostgreSQL connection pool
	dbURL := getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/zahauton")
	poolCfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Failed to parse DB URL: %v", err)
	}
	poolCfg.MaxConns = 50
	poolCfg.MinConns = 10

	dbPool, err := pgxpool.NewWithConfig(context.Background(), poolCfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(context.Background()); err != nil {
		log.Fatalf("PostgreSQL ping failed: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	// Dragonfly / Redis cache
	rdb := redis.NewClient(&redis.Options{
		Addr:     getEnv("DRAGONFLY_URL", "localhost:6379"),
		Password: getEnv("DRAGONFLY_PASSWORD", ""),
		DB:       0,
	})
	defer rdb.Close()

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("Warning: Dragonfly not available, running without cache: %v", err)
		rdb = nil
	} else {
		log.Println("Connected to Dragonfly cache")
	}

	cacheLayer := cache.New(rdb)

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName:       "Zahauton Search API",
		ReadTimeout:   10 * time.Second,
		WriteTimeout:  10 * time.Second,
		Prefork:       false,
		StrictRouting: false,
		CaseSensitive: false,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "${time} | ${status} | ${latency} | ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: getEnv("CORS_ORIGINS", "*"),
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))
	app.Use(limiter.New(limiter.Config{
		Max:               100,
		Expiration:        1 * time.Minute,
		LimiterMiddleware: limiter.SlidingWindow{},
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// API routes
	api := app.Group("/api")
	h := handlers.New(dbPool, cacheLayer)

	api.Get("/search", h.Search)
	api.Get("/person/:tz", h.GetPerson)
	api.Get("/reverse-phone/:phone", h.ReversePhone)
	api.Get("/autocomplete", h.Autocomplete)
	api.Get("/family-tree/:tz", h.FamilyTree)
	api.Get("/stats", h.Stats)

	// Graceful shutdown
	port := getEnv("PORT", "8080")
	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	log.Printf("Zahauton API running on :%s", port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down gracefully...")
	app.Shutdown()
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
