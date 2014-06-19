module TsPath {
    export interface PathCommand {
        (context: CanvasRenderingContext2D): void;
    }

    enum FillRule {
        EvenOdd = 0,
        NonZero = 1
    }

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
        private _source: string;
        private _position: number;

        get Current(): string {
            return this._position >= this._source.length ? null : this._source[this._position];
        }

        MoveNext() { return ++this._position < this._source.length; }
        Reset() { this._position = 0; }

        constructor(source: string) {
            this._source = source;
            this.Reset();
        }
    }

    var _wsChars = [" ", "\t"];
    var _commandChars = ["M", "L", "C", "Q", "A", "Z"];

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
        function isCommandCharacter(current: string) { return _commandChars.indexOf(current) !== -1; }

        function isWhitespaceCharacter(current: string) { return _wsChars.indexOf(current) !== -1; }

        function isNegativeSign(current: string) { return current === "-"; }

        function isComma(current: string) { return current === ","; }

        function isDecimal(current: string) { return current === "."; }

        function isDigit(current: string) { return !isNaN(parseInt(current, 10)); }

        function skipWhitespace(stream: TextStream) { while (isWhitespaceCharacter(stream.Current) && stream.MoveNext()) { } };

        function skipComma(stream: TextStream) { if (isComma(stream.Current)) stream.MoveNext(); };

        function skipArgumentSeparator(stream: TextStream) {
            skipWhitespace(stream);
            skipComma(stream);
            skipWhitespace(stream);
        };

        function readNumber(stream: TextStream) {
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

        function readNumberAndSkipSeparator(stream: TextStream) {
            var num = readNumber(stream);
            skipArgumentSeparator(stream);

            return num;
        }

        function readNumberAndSkipWhitespace(stream: TextStream) {
            var num = readNumber(stream);
            skipWhitespace(stream);

            return num;
        }

        function readPoint(stream: TextStream) {
            var x = readNumberAndSkipSeparator(stream);
            var y = readNumber(stream);

            return new Point(x, y);
        }

        function readPointAndSkipSeparator(stream: TextStream) {
            var point = readPoint(stream);
            skipArgumentSeparator(stream);

            return point;
        }

        function readPointAndSkipWhitespace(stream: TextStream) {
            var point = readPoint(stream);
            skipWhitespace(stream);

            return point;
        }

        function parseFillStyleCommand(stream: TextStream) {
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

        function parseMoveToCommand(stream: TextStream) {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing move to command";
            skipWhitespace(stream);

            var p = readPointAndSkipWhitespace(stream);

            return [CommandFactory.createMoveToCommand(p)];
        }

        function parseLineToCommand(stream: TextStream) {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            skipWhitespace(stream);

            var commands: PathCommand[] = [];

            while (!isCommandCharacter(stream.Current) && stream.Current != null) {
                var p = readPointAndSkipWhitespace(stream);
                commands.push(CommandFactory.createLineToCommand(p));
            }

            return commands;
        }

        function parseCubicBezierCurveCommand(stream: TextStream) {
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

        function parseQuadraticBezierCurveCommand(stream: TextStream) {
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

        function parseEllipticalArcCommand(stream: TextStream) {
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

        function parseClosePathCommand(stream: TextStream) {
            stream.MoveNext();
            skipWhitespace(stream);

            return [CommandFactory.createClosePathCommand()];
        }

        var commandMappings = {
            "F": parseFillStyleCommand,
            "M": parseMoveToCommand,
            "L": parseLineToCommand,
            "C": parseCubicBezierCurveCommand,
            "Q": parseQuadraticBezierCurveCommand,
            "A": parseEllipticalArcCommand,
            "Z": parseClosePathCommand
        };

        function getCommandParser(command: string) {
            var cmd = commandMappings[command];
            if (!cmd) throw "Invalid command";

            return cmd;
        }

        function resolveCommand(validCommands: string[], current: string) {
            if (validCommands.indexOf(current) !== -1) return getCommandParser(current);

            throw "Invalid command";
        }

        export function Parse(path: string): PathCommand[] {
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

    export function clearCanvas(canvas: HTMLCanvasElement) {
        var context = canvas.getContext("2d");
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    export function drawPath(canvas: HTMLCanvasElement, pathText: string, options?: any) {
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
