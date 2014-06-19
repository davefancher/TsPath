module TsPath {
    export interface PathCommand { (context: CanvasRenderingContext2D): void; }
    interface CharacterChecker { (current: string): boolean; }
    interface CommandParser { (stream: TextStream): PathCommand[]; }

    enum FillRule {
        EvenOdd = 0,
        NonZero = 1
    }

    var _wsChars = [" ", "\t"];
    var _commandChars = ["M", "L", "C", "Q", "A", "Z"];

    class Point {
        private _xCoordinate: number;
        private _yCoordinate: number;

        get X(): number { return this._xCoordinate; }
        get Y(): number { return this._yCoordinate; }

        constructor(x: number, y: number) {
            this._xCoordinate = x;
            this._yCoordinate = y;
        }
    }

    class TextStream {
        private _char: string;
        private _source: string;
        private _position: number;

        get Current(): string { return this._char; }

        MoveNext() {
            this._char = (++this._position < this._source.length) ? this._source[this._position] : null;
            return (this._char !== null);
        }

        Reset() { this._char = this._source[this._position = 0]; }

        constructor(source: string) {
            this._source = source;
            this.Reset();
        }
    }

    module CommandFactory {
        export var createFillRuleCommand = (fillRule: FillRule): PathCommand =>
            (c => c.msFillRule = fillRule === FillRule.EvenOdd ? "evenodd" : "nonzero");

        export var createMoveToCommand = (p: Point): PathCommand =>
            (c => c.moveTo(p.X, p.Y));

        export var createLineToCommand = (p: Point): PathCommand =>
            (c => c.lineTo(p.X, p.Y));

        export var createCubicBezierCurveCommand = (cp1: Point, cp2: Point, ep: Point): PathCommand =>
            (c => c.bezierCurveTo(cp1.X, cp1.Y, cp2.X, cp2.Y, ep.X, ep.Y));

        export var createQuadraticBezierCurveCommand = (cp: Point, ep: Point): PathCommand =>
            (c => c.quadraticCurveTo(cp.X, cp.Y, ep.X, ep.Y));

        export var createEllipticalArcCommand = (center: Point, radius: number, startAngle: number, endAngle: number, counterClockwise: boolean): PathCommand =>
            (c => c.arc(center.X, center.Y, radius, startAngle, endAngle, counterClockwise));

        export var createClosePathCommand = (): PathCommand =>
            (c => c.closePath());
    }

    export module PathParser {
        var isCommandCharacter: CharacterChecker = current => _commandChars.indexOf(current) !== -1;
        var isWhitespaceCharacter: CharacterChecker = current => _wsChars.indexOf(current) !== -1;
        var isNegativeSign: CharacterChecker = current => current === "-";
        var isComma: CharacterChecker = current => current === ",";
        var isDecimal: CharacterChecker = current => current === ".";
        var isDigit: CharacterChecker = current => !isNaN(parseInt(current, 10));

        var skipWhitespace = (stream: TextStream) => {
            while (isWhitespaceCharacter(stream.Current) && stream.MoveNext()) { }
        };

        var skipComma = (stream: TextStream) => {
            if (isComma(stream.Current)) stream.MoveNext();
        };

        var skipArgumentSeparator = (stream: TextStream) => {
            skipWhitespace(stream);
            skipComma(stream);
            skipWhitespace(stream);
        };

        var readNumber = (stream: TextStream) => {
            var readNextDigits = (s: TextStream) => {
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

            if (isDigit(stream.Current)) { numStr += readNextDigits(stream); }

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

                        if (!isDigit(stream.Current)) throw "Invalid number";
                        numStr += readNextDigits(stream);
                    }
                }
            }

            return Number(numStr);
        }

        var readNumberAndSkipSeparator = (stream: TextStream) => {
            var num = readNumber(stream);
            skipArgumentSeparator(stream);

            return num;
        }

        var readNumberAndSkipWhitespace = (stream: TextStream) => {
            var num = readNumber(stream);
            skipWhitespace(stream);

            return num;
        }

        var readPoint = (stream: TextStream) => {
            var x = readNumberAndSkipSeparator(stream);
            var y = readNumber(stream);

            return new Point(x, y);
        }

        var readPointAndSkipSeparator = (stream: TextStream) => {
            var point = readPoint(stream);
            skipArgumentSeparator(stream);

            return point;
        }

        var readPointAndSkipWhitespace = (stream: TextStream) => {
            var point = readPoint(stream);
            skipWhitespace(stream);

            return point;
        }

        var parseFillStyleCommand: CommandParser = stream => {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing fill style command";

            var resolveRule = (num: number) => {
                switch (num) {
                    case 0: return FillRule.EvenOdd;
                    case 1: return FillRule.NonZero;
                }

                throw "Invalid fill style option. Valid options are 0 (evenodd) and 1 (nonzero)";
            };

            var fillRule = resolveRule(readNumberAndSkipWhitespace(stream));

            return [CommandFactory.createFillRuleCommand(fillRule)];
        }

        var parseMoveToCommand: CommandParser = stream => {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing move to command";
            skipWhitespace(stream);

            var p = readPointAndSkipWhitespace(stream);

            return [CommandFactory.createMoveToCommand(p)];
        }

        var parseLineToCommand: CommandParser = stream => {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands: PathCommand[] = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var p = readPointAndSkipWhitespace(stream);
                commands.push(CommandFactory.createLineToCommand(p));
            }

            return commands;
        }

        var parseCubicBezierCurveCommand: CommandParser = stream => {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands: PathCommand[] = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var cp1 = readPointAndSkipSeparator(stream);
                var cp2 = readPointAndSkipSeparator(stream);
                var ep = readPointAndSkipSeparator(stream);
                commands.push(CommandFactory.createCubicBezierCurveCommand(cp1, cp2, ep));
            }

            return commands;
        }

        var parseQuadraticBezierCurveCommand: CommandParser = stream => {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands: PathCommand[] = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var cp = readPointAndSkipSeparator(stream);
                var ep = readPointAndSkipSeparator(stream);

                commands.push(CommandFactory.createQuadraticBezierCurveCommand(cp, ep));
            }

            return commands;
        }

        var parseEllipticalArcCommand: CommandParser = stream => {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands: PathCommand[] = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var center = readPointAndSkipSeparator(stream);
                var radius = readNumberAndSkipSeparator(stream);
                var startAngle = readNumberAndSkipSeparator(stream);
                var endAngle = readNumberAndSkipSeparator(stream);
                var ccw = readNumberAndSkipSeparator(stream) === 1;
                commands.push(CommandFactory.createEllipticalArcCommand(center, radius, startAngle, endAngle, ccw));
            }

            return commands;
        }

        var parseClosePathCommand: CommandParser = stream => {
            stream.MoveNext();
            skipWhitespace(stream);

            return [CommandFactory.createClosePathCommand()];
        }

        var getCommandParser = ((commandMappings) => {
            return (command: string) => {
                var cmd = commandMappings[command];
                if (!cmd) throw "Invalid command";

                return cmd;
            }
        })({ "F": parseFillStyleCommand,
             "M": parseMoveToCommand,
             "L": parseLineToCommand,
             "C": parseCubicBezierCurveCommand,
             "Q": parseQuadraticBezierCurveCommand,
             "A": parseEllipticalArcCommand,
             "Z": parseClosePathCommand });

        var resolveCommand = (validCommands: string[], current: string) => {
            if (validCommands.indexOf(current) !== -1) return getCommandParser(current);

            throw "Invalid command";
        }

        export var Parse = (path: string): PathCommand[] => {
            if (path === null || path === "") return [];

            var resolveInitialCommand =
                ((commands: string[]) => current => resolveCommand(commands, current))(["F", "M"]);

            var resolveSecondaryCommand =
                ((commands: string[]) => current => resolveCommand(commands, current))(["M", "L", "C", "Q", "A", "Z"]);

            var stream = new TextStream(path.toUpperCase().trim());

            var commands = resolveInitialCommand(stream.Current)(stream);

            while (true) {
                commands = commands.concat(resolveSecondaryCommand(stream.Current)(stream));

                if (stream.Current != null && isCommandCharacter(stream.Current)) continue;
                if (!stream.MoveNext()) break;
            }

            return commands;
        }
    }
}

module CanvasHelper {
    var defaultOptions = {
        penColor: "black",
        fillRule: "evenodd",
        lineWidth: 1,
        xScale: 1,
        xTransform: 0,
        yScale: 1,
        yTransform: 0
    };

    export var clearCanvas = (canvas: HTMLCanvasElement) => {
        var context = canvas.getContext("2d");
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    export var drawPath = (canvas: HTMLCanvasElement, pathText: string, options?: any) => {
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

        TsPath.PathParser.Parse(pathText).forEach(c => c(context));

        context.stroke();
        context.fill(context.msFillRule || defaultOptions.fillRule);
    }
}
