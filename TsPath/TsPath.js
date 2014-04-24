var TsPath;
(function (TsPath) {
    var Point = (function () {
        function Point(x, y) {
            this._xCoordinate = x;
            this._yCoordinate = y;
        }
        Object.defineProperty(Point.prototype, "X", {
            get: function () {
                return this._xCoordinate;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Point.prototype, "Y", {
            get: function () {
                return this._yCoordinate;
            },
            enumerable: true,
            configurable: true
        });
        return Point;
    })();

    var FillRule;
    (function (FillRule) {
        FillRule[FillRule["EvenOdd"] = 0] = "EvenOdd";
        FillRule[FillRule["NonZero"] = 1] = "NonZero";
    })(FillRule || (FillRule = {}));

    var PathCommandFactory = (function () {
        function PathCommandFactory() {
        }
        PathCommandFactory.createFillRuleCommand = function (fillRule) {
            return function (context) {
                return context.msFillRule = fillRule === 0 /* EvenOdd */ ? "evenodd" : "nonzero";
            };
        };

        PathCommandFactory.createMoveToCommand = function (p) {
            return function (c) {
                return c.moveTo(p.X, p.Y);
            };
        };

        PathCommandFactory.createLineToCommand = function (p) {
            return function (c) {
                return c.lineTo(p.X, p.Y);
            };
        };

        PathCommandFactory.createCubicBezierCurveCommand = function (cp1, cp2, ep) {
            return function (c) {
                return c.bezierCurveTo(cp1.X, cp1.Y, cp2.X, cp2.Y, ep.X, ep.Y);
            };
        };

        PathCommandFactory.createQuadraticBezierCurveCommand = function (cp, ep) {
            return function (c) {
                return c.quadraticCurveTo(cp.X, cp.Y, ep.X, ep.Y);
            };
        };

        PathCommandFactory.createEllipticalArcCommand = function (center, radius, startAngle, endAngle, counterClockwise) {
            return function (c) {
                return c.arc(center.X, center.Y, radius, startAngle, endAngle, counterClockwise);
            };
        };

        PathCommandFactory.createClosePathCommand = function () {
            return function (c) {
                return c.closePath();
            };
        };
        return PathCommandFactory;
    })();

    var TextStream = (function () {
        function TextStream(source) {
            this._source = source;
            this.Reset();
        }
        Object.defineProperty(TextStream.prototype, "Current", {
            get: function () {
                return this._position >= this._source.length ? null : this._source[this._position];
            },
            enumerable: true,
            configurable: true
        });

        TextStream.prototype.MoveNext = function () {
            return ++this._position < this._source.length;
        };
        TextStream.prototype.Reset = function () {
            this._position = 0;
        };
        return TextStream;
    })();

    var PathParser = (function () {
        function PathParser() {
            this._wsChars = [" ", "\t"];
            this._commandChars = ["M", "L", "C", "Q", "A", "Z"];
        }
        PathParser.prototype.IsCommandCharacter = function (current) {
            return this._commandChars.indexOf(current) !== -1;
        };

        PathParser.prototype.IsWhitespaceCharacter = function (current) {
            return this._wsChars.indexOf(current) !== -1;
        };

        PathParser.prototype.IsNegativeSign = function (current) {
            return current === "-";
        };

        PathParser.prototype.IsComma = function (current) {
            return current === ",";
        };

        PathParser.prototype.IsDecimal = function (current) {
            return current === ".";
        };

        PathParser.prototype.IsNumber = function (current) {
            return !isNaN(parseInt(current, 10));
        };

        PathParser.prototype.SkipWhitespace = function (stream) {
            while (this.IsWhitespaceCharacter(stream.Current) && stream.MoveNext()) {
            }
        };

        PathParser.prototype.SkipArgumentSeparator = function (stream) {
            this.SkipWhitespace(stream);
            this.SkipComma(stream);
            this.SkipWhitespace(stream);
        };

        PathParser.prototype.SkipComma = function (stream) {
            if (this.IsComma(stream.Current))
                stream.MoveNext();
        };

        PathParser.prototype.ReadNumber = function (stream) {
            var numStr = "";

            if (this.IsNegativeSign(stream.Current)) {
                numStr += stream.Current;
                stream.MoveNext();
            }

            if (this.IsNumber(stream.Current)) {
                while (this.IsNumber(stream.Current)) {
                    numStr += stream.Current;
                    stream.MoveNext();
                }
            }

            if (this.IsDecimal(stream.Current)) {
                numStr += stream.Current;
                stream.MoveNext();

                if (this.IsNumber(stream.Current)) {
                    while (this.IsNumber(stream.Current)) {
                        numStr += stream.Current;
                        stream.MoveNext();
                    }

                    if (stream.Current === "E") {
                        numStr += stream.Current;
                        stream.MoveNext();
                        if (this.IsNegativeSign(stream.Current)) {
                            numStr += stream.Current;
                            stream.MoveNext();
                        }

                        if (!this.IsNumber(stream.Current))
                            throw "Invalid number";
                        while (this.IsNumber(stream.Current)) {
                            numStr += stream.Current;
                            stream.MoveNext();
                        }
                    }
                }
            }

            return Number(numStr);
        };

        PathParser.prototype.ReadPoint = function (stream) {
            var x = this.ReadNumber(stream);
            this.SkipArgumentSeparator(stream);
            var y = this.ReadNumber(stream);

            return new Point(x, y);
        };

        PathParser.prototype.ParseFillStyleCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing fill style command";

            var fillRule;

            switch (this.ReadNumber(stream)) {
                case 0:
                    fillRule = 0 /* EvenOdd */;
                    break;
                case 1:
                    fillRule = 1 /* NonZero */;
                    break;
                default:
                    throw "Invalid fill style option. Valid options are 0 (evenodd) and 1 (nonzero)";
            }

            this.SkipWhitespace(stream);

            return [PathCommandFactory.createFillRuleCommand(fillRule)];
        };

        PathParser.prototype.ParseMoveToCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing move to command";
            this.SkipWhitespace(stream);

            var p = this.ReadPoint(stream);

            this.SkipWhitespace(stream);

            return [PathCommandFactory.createMoveToCommand(p)];
        };

        PathParser.prototype.ParseLineToCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var p = this.ReadPoint(stream);
                this.SkipWhitespace(stream);
                commands.push(PathCommandFactory.createLineToCommand(p));
            }

            return commands;
        };

        PathParser.prototype.ParseCubicBezierCurveCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var cp1 = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var cp2 = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var ep = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                commands.push(PathCommandFactory.createCubicBezierCurveCommand(cp1, cp2, ep));
            }

            return commands;
        };

        PathParser.prototype.ParseQuadraticBezierCurveCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var cp = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var ep = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);

                commands.push(PathCommandFactory.createQuadraticBezierCurveCommand(cp, ep));
            }

            return commands;
        };

        PathParser.prototype.ParseEllipticalArcCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var center = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var radius = this.ReadNumber(stream);
                this.SkipArgumentSeparator(stream);
                var startAngle = this.ReadNumber(stream);
                this.SkipArgumentSeparator(stream);
                var endAngle = this.ReadNumber(stream);
                this.SkipArgumentSeparator(stream);
                var ccw = this.ReadNumber(stream) === 1;
                this.SkipArgumentSeparator(stream);
                commands.push(PathCommandFactory.createEllipticalArcCommand(center, radius, startAngle, endAngle, ccw));
            }

            return commands;
        };

        PathParser.prototype.ParseClosePathCommand = function (stream) {
            stream.MoveNext();
            this.SkipWhitespace(stream);

            return [PathCommandFactory.createClosePathCommand()];
        };

        PathParser.prototype.ResolveInitialCommand = function (stream) {
            this.SkipWhitespace(stream);

            switch (stream.Current) {
                case "F":
                    return this.ParseFillStyleCommand(stream);
                case "M":
                    return this.ParseMoveToCommand(stream);
            }

            throw "Invalid command";
        };

        PathParser.prototype.ResolveDrawingCommands = function (stream) {
            switch (stream.Current) {
                case "M":
                    return this.ParseMoveToCommand(stream);
                case "L":
                    return this.ParseLineToCommand(stream);
                case "C":
                    return this.ParseCubicBezierCurveCommand(stream);
                case "Q":
                    return this.ParseQuadraticBezierCurveCommand(stream);
                case "A":
                    return this.ParseEllipticalArcCommand(stream);
                case "Z":
                    return this.ParseClosePathCommand(stream);
            }

            throw "Invalid command";
        };

        PathParser.prototype.Parse = function (path) {
            if (path === "")
                return [];

            var stream = new TextStream(path.toUpperCase());

            var commands = this.ResolveInitialCommand(stream);

            while (true) {
                commands = commands.concat(this.ResolveDrawingCommands(stream));

                if (stream.Current != null && this.IsCommandCharacter(stream.Current))
                    continue;
                if (!stream.MoveNext())
                    break;
            }

            return commands;
        };
        return PathParser;
    })();
    TsPath.PathParser = PathParser;
})(TsPath || (TsPath = {}));

var CanvasExtensions = (function () {
    function CanvasExtensions() {
    }
    CanvasExtensions.clearCanvas = function (canvas) {
        var context = canvas.getContext("2d");
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    CanvasExtensions.drawPath = function (canvas, pathText, options) {
        var context = canvas.getContext("2d");

        if (options) {
            context.lineWidth = options.strokeThickness || 1;
            context.strokeStyle = options.strokeStyle || "black";
            context.fillStyle = options.fillStyle || "black";
            context.scale(options.scaleX || 1, options.scaleY || 1);
            context.translate(options.translateX || 0, options.translateY || 0);
        } else {
            context.lineWidth = 1;
            context.strokeStyle = "black";
            context.fillStyle = "black";
        }

        context.beginPath();

        (new TsPath.PathParser()).Parse(pathText).forEach(function (c) {
            return c(context);
        });

        context.stroke();
        context.fill(context.msFillRule || "evenodd");
    };
    return CanvasExtensions;
})();
//# sourceMappingURL=TsPath.js.map
