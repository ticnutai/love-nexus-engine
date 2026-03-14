package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"zahauton-api/cache"
)

// Person is the full person record from the database.
type Person struct {
	RowID        int     `json:"row_id"`
	TZ           string  `json:"tz"`
	FamilyName   *string `json:"family_name"`
	FirstName    *string `json:"first_name"`
	PrevName     *string `json:"prev_name"`
	FatherName   *string `json:"father_name"`
	MotherName   *string `json:"mother_name"`
	FatherTZ     *string `json:"father_tz"`
	MotherTZ     *string `json:"mother_tz"`
	City         *string `json:"city"`
	Street       *string `json:"street"`
	HouseNum     *string `json:"house_num"`
	Zipcode      *string `json:"zipcode"`
	PhoneArea    *string `json:"phone_area"`
	Phone        *string `json:"phone"`
	ExtraPhones  *string `json:"extra_phones"`
	BirthYear    *string `json:"birth_year"`
	BirthMonth   *string `json:"birth_month"`
	BirthDay     *string `json:"birth_day"`
	BirthDOW     *string `json:"birth_dow"`
	HebYear      *string `json:"heb_year"`
	HebMonth     *string `json:"heb_month"`
	HebDay       *string `json:"heb_day"`
	AliyaYear    *string `json:"aliya_year"`
	AliyaMonth   *string `json:"aliya_month"`
	AliyaDay     *string `json:"aliya_day"`
	BirthCountry *string `json:"birth_country"`
	Marital      *string `json:"marital"`
	Clan         *string `json:"clan"`
}

const personSQL = `SELECT 
	row_id, tz, family_name, first_name, prev_name, father_name, mother_name,
	father_tz, mother_tz, city, street, house_num, zipcode,
	phone_area, phone, extra_phones,
	birth_year, birth_month, birth_day, birth_dow,
	heb_year, heb_month, heb_day,
	aliya_year, aliya_month, aliya_day,
	birth_country, marital, clan
FROM people WHERE tz = $1`

// GetPerson handles GET /api/person/:tz
func (h *Handler) GetPerson(c *fiber.Ctx) error {
	tz := c.Params("tz")
	if tz == "" || len(tz) > 9 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid TZ"})
	}

	// Cache check
	key := cache.PersonKey(tz)
	var cached Person
	if h.cache.Get(c.Context(), key, &cached) {
		return c.JSON(cached)
	}

	row := h.db.QueryRow(c.Context(), personSQL, tz)
	p, err := scanPerson(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Person not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	h.cache.Set(c.Context(), key, p, cache.PersonTTL)

	return c.JSON(p)
}

// ReversePhone handles GET /api/reverse-phone/:phone
func (h *Handler) ReversePhone(c *fiber.Ctx) error {
	phone := c.Params("phone")
	if phone == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Phone number required"})
	}

	rows, err := h.db.Query(c.Context(),
		`SELECT row_id, tz, family_name, first_name, city, street, phone, birth_year 
		 FROM people WHERE phone = $1 OR extra_phones LIKE '%' || $1 || '%' LIMIT 50`, phone)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	results, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (SearchResult, error) {
		var r SearchResult
		err := row.Scan(&r.RowID, &r.TZ, &r.FamilyName, &r.FirstName, &r.City, &r.Street, &r.Phone, &r.BirthYear)
		return r, err
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{"results": results, "count": len(results)})
}

func scanPerson(row pgx.Row) (Person, error) {
	var p Person
	err := row.Scan(
		&p.RowID, &p.TZ, &p.FamilyName, &p.FirstName, &p.PrevName, &p.FatherName, &p.MotherName,
		&p.FatherTZ, &p.MotherTZ, &p.City, &p.Street, &p.HouseNum, &p.Zipcode,
		&p.PhoneArea, &p.Phone, &p.ExtraPhones,
		&p.BirthYear, &p.BirthMonth, &p.BirthDay, &p.BirthDOW,
		&p.HebYear, &p.HebMonth, &p.HebDay,
		&p.AliyaYear, &p.AliyaMonth, &p.AliyaDay,
		&p.BirthCountry, &p.Marital, &p.Clan,
	)
	return p, err
}
