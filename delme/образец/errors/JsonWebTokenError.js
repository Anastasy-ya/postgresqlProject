class JsonWebTokenError extends Error { // 401
  constructor(message) {
    super(message);
    this.name = 'Access denied!';
    this.statusCode = 401;
  }
}

module.exports = JsonWebTokenError;
