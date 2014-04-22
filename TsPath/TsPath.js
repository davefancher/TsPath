﻿var TsPath;
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

    var FillRuleCommand = (function () {
        function FillRuleCommand(rule) {
            this._fillRule = rule;
        }
        Object.defineProperty(FillRuleCommand.prototype, "FillRule", {
            get: function () {
                return this._fillRule;
            },
            enumerable: true,
            configurable: true
        });

        FillRuleCommand.prototype.Invoke = function (context) {
            context.msFillRule = this._fillRule === 0 /* EvenOdd */ ? "evenodd" : "nonzero";
        };
        return FillRuleCommand;
    })();

    var MoveToCommand = (function () {
        function MoveToCommand(p) {
            this._point = p;
        }
        Object.defineProperty(MoveToCommand.prototype, "Point", {
            get: function () {
                return this._point;
            },
            enumerable: true,
            configurable: true
        });

        MoveToCommand.prototype.Invoke = function (context) {
            context.moveTo(this._point.X, this.Point.Y);
        };
        return MoveToCommand;
    })();

    var LineToCommand = (function () {
        function LineToCommand(p) {
            this._point = p;
        }
        Object.defineProperty(LineToCommand.prototype, "Point", {
            get: function () {
                return this._point;
            },
            enumerable: true,
            configurable: true
        });

        LineToCommand.prototype.Invoke = function (context) {
            context.lineTo(this._point.X, this.Point.Y);
        };
        return LineToCommand;
    })();

    var CubicBezierCurveCommand = (function () {
        function CubicBezierCurveCommand(cp1, cp2, ep) {
            this._controlPoint1 = cp1;
            this._controlPoint2 = cp2;
            this._endPoint = ep;
        }
        Object.defineProperty(CubicBezierCurveCommand.prototype, "ControlPoint1", {
            get: function () {
                return this._controlPoint1;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CubicBezierCurveCommand.prototype, "ControlPoint2", {
            get: function () {
                return this._controlPoint2;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CubicBezierCurveCommand.prototype, "EndPoint", {
            get: function () {
                return this._endPoint;
            },
            enumerable: true,
            configurable: true
        });

        CubicBezierCurveCommand.prototype.Invoke = function (context) {
            context.bezierCurveTo(this._controlPoint1.X, this._controlPoint1.Y, this._controlPoint2.X, this._controlPoint2.Y, this._endPoint.X, this._endPoint.Y);
        };
        return CubicBezierCurveCommand;
    })();

    var QuadraticBezierCurveCommand = (function () {
        function QuadraticBezierCurveCommand(cp, ep) {
            this._controlPoint = cp;
            this._endPoint = ep;
        }
        Object.defineProperty(QuadraticBezierCurveCommand.prototype, "ControlPoint", {
            get: function () {
                return this._controlPoint;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(QuadraticBezierCurveCommand.prototype, "EndPoint", {
            get: function () {
                return this._endPoint;
            },
            enumerable: true,
            configurable: true
        });

        QuadraticBezierCurveCommand.prototype.Invoke = function (context) {
            context.quadraticCurveTo(this._controlPoint.X, this._controlPoint.Y, this._endPoint.X, this._endPoint.Y);
        };
        return QuadraticBezierCurveCommand;
    })();

    var EllipticalArcCommand = (function () {
        function EllipticalArcCommand(centerPoint, radius, startAngle, endAngle, counterClockwise) {
            this._centerPoint = centerPoint;
            this._radius = radius;
            this._startAngle = startAngle;
            this._endAngle = endAngle;
            this._counterClockwise = counterClockwise;
        }
        EllipticalArcCommand.prototype.Invoke = function (context) {
            context.arc(this._centerPoint.X, this._centerPoint.Y, this._radius, this._startAngle, this._endAngle, this._counterClockwise);
        };
        return EllipticalArcCommand;
    })();

    var ClosePathCommand = (function () {
        function ClosePathCommand() {
        }
        ClosePathCommand.prototype.Invoke = function (context) {
            context.closePath();
        };
        return ClosePathCommand;
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
            this.SkipWhitespace(stream);
            this.SkipComma(stream);
            this.SkipWhitespace(stream);
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

            return [new FillRuleCommand(fillRule)];
        };

        PathParser.prototype.ParseMoveToCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing move to command";
            this.SkipWhitespace(stream);

            var p = this.ReadPoint(stream);

            this.SkipWhitespace(stream);

            return [new MoveToCommand(p)];
        };

        PathParser.prototype.ParseLineToCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var p = this.ReadPoint(stream);
                this.SkipWhitespace(stream);
                commands.push(new LineToCommand(p));
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
                this.SkipWhitespace(stream);
                var cp2 = this.ReadPoint(stream);
                this.SkipWhitespace(stream);
                var ep = this.ReadPoint(stream);
                this.SkipWhitespace(stream);
                commands.push(new CubicBezierCurveCommand(cp1, cp2, ep));
            }

            return commands;
        };

        PathParser.prototype.ParseClosePathCommand = function (stream) {
            stream.MoveNext();
            this.SkipWhitespace(stream);

            return [new ClosePathCommand()];
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
                    return [];
                case "A":
                    return [];
                case "Z":
                    return this.ParseClosePathCommand(stream);
            }

            throw "Invalid command";
        };

        PathParser.prototype.Parse = function (context, path) {
            if (context === null)
                throw "Missing drawing context";
            if (path === "")
                return [];

            var stream = new TextStream(path.toUpperCase());

            this.ResolveInitialCommand(stream).forEach(function (c) {
                return c.Invoke(context);
            });

            while (true) {
                this.ResolveDrawingCommands(stream).forEach(function (c) {
                    return c.Invoke(context);
                });

                if (stream.Current != null && this.IsCommandCharacter(stream.Current))
                    continue;
                if (!stream.MoveNext())
                    break;
            }

            context.stroke();
            context.fill();
        };
        return PathParser;
    })();
    TsPath.PathParser = PathParser;
})(TsPath || (TsPath = {}));
//# sourceMappingURL=TsPath.js.map
