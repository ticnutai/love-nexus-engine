package handlers

import (
	"github.com/jackc/pgx/v5/pgxpool"

	"zahauton-api/cache"
)

// Handler holds shared dependencies for all API handlers.
type Handler struct {
	db    *pgxpool.Pool
	cache *cache.Cache
}

// New creates a new Handler with DB pool and cache.
func New(db *pgxpool.Pool, c *cache.Cache) *Handler {
	return &Handler{db: db, cache: c}
}
