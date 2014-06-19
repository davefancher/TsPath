var TsPath;
(function (TsPath) {
    var FillRule;
    (function (FillRule) {
        FillRule[FillRule["EvenOdd"] = 0] = "EvenOdd";
        FillRule[FillRule["NonZero"] = 1] = "NonZero";
    })(FillRule || (FillRule = {}));

    var _wsChars = [" ", "\t"];
    var _commandChars = ["M", "L", "C", "Q", "A", "Z"];

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

    var TextStream = (function () {
        function TextStream(source) {
            this._source = source;
            this.Reset();
        }
        Object.defineProperty(TextStream.prototype, "Current", {
            get: function () {
                return this._char;
            },
            enumerable: true,
            configurable: true
        });

        TextStream.prototype.MoveNext = function () {
            this._char = (++this._position < this._source.length) ? this._source[this._position] : null;
            return (this._char !== null);
        };

        TextStream.prototype.Reset = function () {
            this._char = this._source[this._position = 0];
        };
        return TextStream;
    })();

    var CommandFactory;
    (function (CommandFactory) {
        CommandFactory.createFillRuleCommand = function (fillRule) {
            return (function (c) {
                return c.msFillRule = fillRule === 0 /* EvenOdd */ ? "evenodd" : "nonzero";
            });
        };

        CommandFactory.createMoveToCommand = function (p) {
            return (function (c) {
                return c.moveTo(p.X, p.Y);
            });
        };

        CommandFactory.createLineToCommand = function (p) {
            return (function (c) {
                return c.lineTo(p.X, p.Y);
            });
        };

        CommandFactory.createCubicBezierCurveCommand = function (cp1, cp2, ep) {
            return (function (c) {
                return c.bezierCurveTo(cp1.X, cp1.Y, cp2.X, cp2.Y, ep.X, ep.Y);
            });
        };

        CommandFactory.createQuadraticBezierCurveCommand = function (cp, ep) {
            return (function (c) {
                return c.quadraticCurveTo(cp.X, cp.Y, ep.X, ep.Y);
            });
        };

        CommandFactory.createEllipticalArcCommand = function (center, radius, startAngle, endAngle, counterClockwise) {
            return (function (c) {
                return c.arc(center.X, center.Y, radius, startAngle, endAngle, counterClockwise);
            });
        };

        CommandFactory.createClosePathCommand = function () {
            return (function (c) {
                return c.closePath();
            });
        };
    })(CommandFactory || (CommandFactory = {}));

    (function (PathParser) {
        var isCommandCharacter = function (current) {
            return _commandChars.indexOf(current) !== -1;
        };
        var isWhitespaceCharacter = function (current) {
            return _wsChars.indexOf(current) !== -1;
        };
        var isNegativeSign = function (current) {
            return current === "-";
        };
        var isComma = function (current) {
            return current === ",";
        };
        var isDecimal = function (current) {
            return current === ".";
        };
        var isDigit = function (current) {
            return !isNaN(parseInt(current, 10));
        };

        var skipWhitespace = function (stream) {
            while (isWhitespaceCharacter(stream.Current) && stream.MoveNext()) {
            }
        };

        var skipComma = function (stream) {
            if (isComma(stream.Current))
                stream.MoveNext();
        };

        var skipArgumentSeparator = function (stream) {
            skipWhitespace(stream);
            skipComma(stream);
            skipWhitespace(stream);
        };

        var readNumber = function (stream) {
            var readNextDigits = function (s) {
                var digits = "";
                while (isDigit(s.Current)) {
                    digits += s.Current;
                    s.MoveNext();
                }
                return digits;
            };

            var numStr = "";

            if (isNegativeSign(stream.Current)) {
                numStr += stream.Current;
                stream.MoveNext();
            }

            if (isDigit(stream.Current)) {
                numStr += readNextDigits(stream);
            }

            if (isDecimal(stream.Current)) {
                numStr += stream.Current;
                stream.MoveNext();

                if (isDigit(stream.Current)) {
                    numStr += readNextDigits(stream);

                    if (stream.Current === "E") {
                        numStr += stream.Current;
                        stream.MoveNext();
                        if (isNegativeSign(stream.Current)) {
                            numStr += stream.Current;
                            stream.MoveNext();
                        }

                        if (!isDigit(stream.Current))
                            throw "Invalid number";
                        numStr += readNextDigits(stream);
                    }
                }
            }

            return Number(numStr);
        };

        var readNumberAndSkipSeparator = function (stream) {
            var num = readNumber(stream);
            skipArgumentSeparator(stream);

            return num;
        };

        var readNumberAndSkipWhitespace = function (stream) {
            var num = readNumber(stream);
            skipWhitespace(stream);

            return num;
        };

        var readPoint = function (stream) {
            var x = readNumberAndSkipSeparator(stream);
            var y = readNumber(stream);

            return new Point(x, y);
        };

        var readPointAndSkipSeparator = function (stream) {
            var point = readPoint(stream);
            skipArgumentSeparator(stream);

            return point;
        };

        var readPointAndSkipWhitespace = function (stream) {
            var point = readPoint(stream);
            skipWhitespace(stream);

            return point;
        };

        var parseFillStyleCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing fill style command";

            var resolveRule = function (num) {
                switch (num) {
                    case 0:
                        return 0 /* EvenOdd */;
                    case 1:
                        return 1 /* NonZero */;
                }

                throw "Invalid fill style option. Valid options are 0 (evenodd) and 1 (nonzero)";
            };

            var fillRule = resolveRule(readNumberAndSkipWhitespace(stream));

            return [CommandFactory.createFillRuleCommand(fillRule)];
        };

        var parseMoveToCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing move to command";
            skipWhitespace(stream);

            var p = readPointAndSkipWhitespace(stream);

            return [CommandFactory.createMoveToCommand(p)];
        };

        var parseLineToCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var p = readPointAndSkipWhitespace(stream);
                commands.push(CommandFactory.createLineToCommand(p));
            }

            return commands;
        };

        var parseCubicBezierCurveCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var cp1 = readPointAndSkipSeparator(stream);
                var cp2 = readPointAndSkipSeparator(stream);
                var ep = readPointAndSkipSeparator(stream);
                commands.push(CommandFactory.createCubicBezierCurveCommand(cp1, cp2, ep));
            }

            return commands;
        };

        var parseQuadraticBezierCurveCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var cp = readPointAndSkipSeparator(stream);
                var ep = readPointAndSkipSeparator(stream);

                commands.push(CommandFactory.createQuadraticBezierCurveCommand(cp, ep));
            }

            return commands;
        };

        var parseEllipticalArcCommand = function (stream) {
            if (!stream.MoveNext())
                throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var center = readPointAndSkipSeparator(stream);
                var radius = readNumberAndSkipSeparator(stream);
                var startAngle = readNumberAndSkipSeparator(stream);
                var endAngle = readNumberAndSkipSeparator(stream);
                var ccw = readNumberAndSkipSeparator(stream) === 1;
                commands.push(CommandFactory.createEllipticalArcCommand(center, radius, startAngle, endAngle, ccw));
            }

            return commands;
        };

        var parseClosePathCommand = function (stream) {
            stream.MoveNext();
            skipWhitespace(stream);

            return [CommandFactory.createClosePathCommand()];
        };

        var getCommandParser = (function (commandMappings) {
            return function (command) {
                var cmd = commandMappings[command];
                if (!cmd)
                    throw "Invalid command";

                return cmd;
            };
        })({
            "F": parseFillStyleCommand,
            "M": parseMoveToCommand,
            "L": parseLineToCommand,
            "C": parseCubicBezierCurveCommand,
            "Q": parseQuadraticBezierCurveCommand,
            "A": parseEllipticalArcCommand,
            "Z": parseClosePathCommand });

        var resolveCommand = function (validCommands, current) {
            if (validCommands.indexOf(current) !== -1)
                return getCommandParser(current);

            throw "Invalid command";
        };

        PathParser.Parse = function (path) {
            if (path === null || path === "")
                return [];

            var resolveInitialCommand = (function (commands) {
                return function (current) {
                    return resolveCommand(commands, current);
                };
            })(["F", "M"]);

            var resolveSecondaryCommand = (function (commands) {
                return function (current) {
                    return resolveCommand(commands, current);
                };
            })(["M", "L", "C", "Q", "A", "Z"]);

            var stream = new TextStream(path.toUpperCase().trim());

            var commands = resolveInitialCommand(stream.Current)(stream);

            while (true) {
                commands = commands.concat(resolveSecondaryCommand(stream.Current)(stream));

                if (stream.Current != null && isCommandCharacter(stream.Current))
                    continue;
                if (!stream.MoveNext())
                    break;
            }

            return commands;
        };
    })(TsPath.PathParser || (TsPath.PathParser = {}));
    var PathParser = TsPath.PathParser;
})(TsPath || (TsPath = {}));

var CanvasHelper;
(function (CanvasHelper) {
    var defaultOptions = {
        penColor: "black",
        fillRule: "evenodd",
        lineWidth: 1,
        xScale: 1,
        xTransform: 0,
        yScale: 1,
        yTransform: 0
    };

    CanvasHelper.clearCanvas = function (canvas) {
        var context = canvas.getContext("2d");
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    CanvasHelper.drawPath = function (canvas, pathText, options) {
        var context = canvas.getContext("2d");

        if (options) {
            context.lineWidth = options.strokeThickness || 1;
            context.strokeStyle = options.strokeStyle || defaultOptions.penColor;
            context.fillStyle = options.fillStyle || defaultOptions.penColor;
            context.scale(options.scaleX || defaultOptions.xScale, options.scaleY || defaultOptions.yScale);
            context.translate(options.translateX || defaultOptions.xTransform, options.translateY || defaultOptions.yTransform);
        } else {
            context.lineWidth = defaultOptions.lineWidth;
            context.strokeStyle = defaultOptions.penColor;
            context.fillStyle = defaultOptions.penColor;
        }

        context.beginPath();

        TsPath.PathParser.Parse(pathText).forEach(function (c) {
            return c(context);
        });

        context.stroke();
        context.fill(context.msFillRule || defaultOptions.fillRule);
    };
})(CanvasHelper || (CanvasHelper = {}));
//# sourceMappingURL=TsPath.js.map
