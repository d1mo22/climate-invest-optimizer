package repository

import "errors"

// Domain-level sentinel errors that infrastructure repos can return.
// Services should map these to models.AppError types.
var (
	ErrMeasureNotAppliedToShop     = errors.New("measure not applied to this shop")
	ErrMeasureAlreadyAppliedToShop = errors.New("measure already applied to this shop")
)
