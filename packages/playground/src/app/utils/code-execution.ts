export const wrapper = `
  window.___originalXmlHttpRequestOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    const event = { type: "network", message: \`XHR: \${Array.prototype.join.call(arguments, " ")}\` };
    events.push(event);

    const send = this.send;
    this.send = function() {
      try {
        event.details = { req: JSON.parse(arguments[0]) };
      } catch (e) {
        event.details = { req: arguments[0] };
      }

      const onreadystatechange = this.onreadystatechange;
      this.onreadystatechange = function() {
        const result = onreadystatechange.apply(this, arguments);

        if (this.readyState === 4) {
          try {
            event.details = { ...event.details, res: JSON.parse(this.responseText) };
          } catch (e) {
            event.details = { ...event.details, res: this.responseText };
          }
        }

        return result;
      };

      return send.apply(this, arguments);
    };

    return ___originalXmlHttpRequestOpen.apply(this, arguments);
  };

  window.___originalConsoleLog = console.log;
  console.log = function() {
    const event = { type: "info", message: Array.prototype.map.call(arguments, x => typeof x === "object" ? JSON.stringify(x) : x.toString()).join(" ") };
    events.push(event);
    return ___originalConsoleLog.apply(this, arguments);
  }

  window.___originalConsoleError = console.error;
  console.error = function() {
    //if (typeof arguments[0] === "string") {
      const event = { type: "error", message: Array.prototype.map.call(arguments, x => typeof x === "object" ? JSON.stringify(x) : x.toString()).join(" ") };
      events.push(event);
    //}
    return ___originalConsoleError.apply(this, arguments);
  }
`;

export const unwrap = `
  XMLHttpRequest.prototype.open = window.___originalXmlHttpRequestOpen;
  console.log = window.___originalConsoleLog;
  console.error = window.___originalConsoleError;
`;
