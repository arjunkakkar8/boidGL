module.exports = {
    greaterThan: function(a, b, opts) {
      if (a > b) return opts.fn(this);
      else return opts.inverse(this);
    },
    ifEq: function(a, b, opts) {
      if (a === b) return opts.fn(this);
      else return opts.inverse(this);
    },
    ifNeq: function(a, b, opts) {
      if (a !== b) return opts.fn(this);
      else return opts.inverse(this);
    },
    lessThan: function(a, b, opts) {
      if (a < b) return opts.fn(this);
      else return opts.inverse(this);
    },
    slugify: function(text) {
      return String(text)
        .replace(/\s+/g, '-')
        .toLowerCase();
    }
  };