class Forbidden extends Error { // 403 отказ в правах доступа
  constructor(message) {
    super(message);
    this.name = 'HTTP 403 Forbidden';
    this.statusCode = 403;
  }
}

module.exports = Forbidden;
