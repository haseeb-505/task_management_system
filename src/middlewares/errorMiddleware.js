export const errorHandler = (err, req, res, next) => {
  console.error("Error caught by middleware:", err);

  // MySQL Duplicate Entry
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry: a record with this value already exists."
    });
  }

  // Validation errors (optional, if you throw custom ApiError)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Generic fallback
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
};
