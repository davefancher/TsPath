module TsPath {
    export interface IPathCommand {
        (context: CanvasRenderingContext2D): void;
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

    enum FillRule {
        EvenOdd = 0,
        NonZero = 1
    }

    class PathCommandFactory {
        static createFillRuleCommand(fillRule: FillRule): IPathCommand {
            return (context: CanvasRenderingContext2D) => context.msFillRule = fillRule === FillRule.EvenOdd ? "evenodd" : "nonzero";
        }

        static createMoveToCommand(p: Point): IPathCommand {
            return c => c.moveTo(p.X, p.Y);
        }

        static createLineToCommand(p: Point): IPathCommand {
            return c => c.lineTo(p.X, p.Y);
        }

        static createCubicBezierCurveCommand(cp1: Point, cp2: Point, ep: Point): IPathCommand {
            return c => c.bezierCurveTo(cp1.X, cp1.Y, cp2.X, cp2.Y, ep.X, ep.Y);
        }

        static createQuadraticBezierCurveCommand(cp: Point, ep: Point): IPathCommand {
            return c => c.quadraticCurveTo(cp.X, cp.Y, ep.X, ep.Y);
        }

        static createEllipticalArcCommand(center: Point, radius: number, startAngle: number, endAngle: number, counterClockwise: boolean): IPathCommand {
            return c => c.arc(center.X, center.Y, radius, startAngle, endAngle, counterClockwise);
        }

        static createClosePathCommand(): IPathCommand {
            return c => c.closePath();
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

    export class PathParser {
        private _wsChars = [" ", "\t"];
        private _commandChars = ["M", "L", "C", "Q", "A", "Z"];

        private IsCommandCharacter(current: string): boolean {
            return this._commandChars.indexOf(current) !== -1;
        }

        private IsWhitespaceCharacter(current: string): boolean {
            return this._wsChars.indexOf(current) !== -1;
        }

        private IsNegativeSign(current: string): boolean {
            return current === "-";
        }

        private IsComma(current: string): boolean {
            return current === ",";
        }

        private IsDecimal(current: string): boolean {
            return current === ".";
        }

        private IsNumber(current: string) {
            return !isNaN(parseInt(current, 10));
        }

        private SkipWhitespace(stream: TextStream) {
            while (this.IsWhitespaceCharacter(stream.Current) && stream.MoveNext()) { }
        }

        private SkipArgumentSeparator(stream: TextStream) {
            this.SkipWhitespace(stream);
            this.SkipComma(stream);
            this.SkipWhitespace(stream);
        }

        private SkipComma(stream: TextStream) {
            if (this.IsComma(stream.Current)) stream.MoveNext();
        }

        private ReadNumber(stream: TextStream): number {
            var numStr = "";

            if (this.IsNegativeSign(stream.Current)) {
                numStr += stream.Current;
                stream.MoveNext();
            }

            if(this.IsNumber(stream.Current)) {
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

                        if (!this.IsNumber(stream.Current)) throw "Invalid number"
                        while (this.IsNumber(stream.Current)) {
                            numStr += stream.Current;
                            stream.MoveNext();
                        }
                    }
                }
            }

            return Number(numStr);
        }

        private ReadNumberAndSkipSeparator(stream: TextStream): number {
            var num = this.ReadNumber(stream);
            this.SkipArgumentSeparator(stream);

            return num;
        }

        private ReadPoint(stream: TextStream): Point {
            var x = this.ReadNumber(stream);
            this.SkipArgumentSeparator(stream);
            var y = this.ReadNumber(stream);

            return new Point(x, y);
        }

        private ReadPointAndSkipSeparator(stream: TextStream): Point {
            var point = this.ReadPoint(stream);
            this.SkipArgumentSeparator(stream);

            return point;
        }

        private ParseFillStyleCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing fill style command";

            var fillRule: FillRule;

            switch (this.ReadNumber(stream)) {
                case 0:
                    fillRule = FillRule.EvenOdd;
                    break;
                case 1:
                    fillRule = FillRule.NonZero;
                    break;
                default:
                    throw "Invalid fill style option. Valid options are 0 (evenodd) and 1 (nonzero)";
            }

            this.SkipWhitespace(stream);

            return [ PathCommandFactory.createFillRuleCommand(fillRule) ];
        }

        private ParseMoveToCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing move to command";
            this.SkipWhitespace(stream);

            var p = this.ReadPoint(stream);

            this.SkipWhitespace(stream);

            return [ PathCommandFactory.createMoveToCommand(p) ];
        }

        private ParseLineToCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var p = this.ReadPoint(stream);
                this.SkipWhitespace(stream);
                commands.push(PathCommandFactory.createLineToCommand(p));
            }

            return commands;
        }

        private ParseCubicBezierCurveCommand(stream: TextStream): IPathCommand[]{
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var cp1 = this.ReadPointAndSkipSeparator(stream);
                var cp2 = this.ReadPointAndSkipSeparator(stream);
                var ep = this.ReadPointAndSkipSeparator(stream);
                commands.push(PathCommandFactory.createCubicBezierCurveCommand(cp1, cp2, ep));
            }

            return commands;
        }

        private ParseQuadraticBezierCurveCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var cp = this.ReadPointAndSkipSeparator(stream);
                var ep = this.ReadPointAndSkipSeparator(stream);

                commands.push(PathCommandFactory.createQuadraticBezierCurveCommand(cp, ep));
            }

            return commands;
        }

        private ParseEllipticalArcCommand(stream: TextStream): IPathCommand[]{
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var center = this.ReadPointAndSkipSeparator(stream);
                var radius = this.ReadNumberAndSkipSeparator(stream);
                var startAngle = this.ReadNumberAndSkipSeparator(stream);
                var endAngle = this.ReadNumberAndSkipSeparator(stream);
                var ccw = this.ReadNumberAndSkipSeparator(stream) === 1;
                commands.push(PathCommandFactory.createEllipticalArcCommand(center, radius, startAngle, endAngle, ccw));
            }

            return commands;
        }

        private ParseClosePathCommand(stream: TextStream): IPathCommand[] {
            stream.MoveNext();
            this.SkipWhitespace(stream);

            return [PathCommandFactory.createClosePathCommand()];
        }

        private ResolveInitialCommand(stream: TextStream): IPathCommand[] {
            this.SkipWhitespace(stream);

            switch (stream.Current) {
                case "F": return this.ParseFillStyleCommand(stream);
                case "M": return this.ParseMoveToCommand(stream);
            }

            throw "Invalid command";
        }

        private ResolveDrawingCommands(stream: TextStream) : IPathCommand[] {
            switch (stream.Current) {
                case "M": return this.ParseMoveToCommand(stream);
                case "L": return this.ParseLineToCommand(stream);
                case "C": return this.ParseCubicBezierCurveCommand(stream);
                case "Q": return this.ParseQuadraticBezierCurveCommand(stream);
                case "A": return this.ParseEllipticalArcCommand(stream);
                case "Z": return this.ParseClosePathCommand(stream);
            }

            throw "Invalid command";
        }

        Parse(path: string): IPathCommand[] {
            if (path === "") return [];

            var stream = new TextStream(path.toUpperCase());

            var commands: IPathCommand[] = this.ResolveInitialCommand(stream);

            while (true) {
                commands = commands.concat(this.ResolveDrawingCommands(stream));

                if (stream.Current != null && this.IsCommandCharacter(stream.Current)) continue;
                if (!stream.MoveNext()) break;
            }

            return commands;
        }
    }
}

module CanvasHelper {
    var defaults = {
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
            context.strokeStyle = options.strokeStyle || defaults.penColor;
            context.fillStyle = options.fillStyle || defaults.penColor;
            context.scale(options.scaleX || defaults.xScale, options.scaleY || defaults.yScale);
            context.translate(options.translateX || defaults.xTransform, options.translateY || defaults.yTransform);
        } else {
            context.lineWidth = defaults.lineWidth;
            context.strokeStyle = defaults.penColor;
            context.fillStyle = defaults.penColor;
        }

        context.beginPath();

        (new TsPath.PathParser()).Parse(pathText).forEach(c => c(context));

        context.stroke();
        context.fill(context.msFillRule || defaults.fillRule);
    }
}
