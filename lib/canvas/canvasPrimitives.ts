import { Transition } from "../util-classes/transition";

export type TransitionLabelStyle = {
  baseColor: string;
  bgColor: string;
  borderColor: string;
};

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number; r?: number },
  to: { x: number; y: number; r?: number },
  color: string
) {
  const arrowHeadLength = 15;
  const fromR = from.r ?? 0;
  const toR = to.r ?? 0;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-2) return;
  const angle = Math.atan2(dy, dx);

  const startX = from.x + (fromR * dx) / length;
  const startY = from.y + (fromR * dy) / length;
  const endX = to.x - (toR * dx) / length;
  const endY = to.y - (toR * dy) / length;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  const arrowAngle = Math.PI / 6;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowHeadLength * Math.cos(angle - arrowAngle),
    endY - arrowHeadLength * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    endX - arrowHeadLength * Math.cos(angle + arrowAngle),
    endY - arrowHeadLength * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawLoop(
  ctx: CanvasRenderingContext2D,
  state: { x: number; y: number; r?: number },
  color: string
) {
  const radius = (state.r ?? 0) + 12;
  const loopRadius = 16;
  const centerX = state.x;
  const centerY = state.y - radius;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.arc(centerX, centerY, loopRadius, Math.PI * 0.2, Math.PI * 1.8);
  ctx.stroke();

  const angle = Math.PI * 0.2;
  const endX = centerX + loopRadius * Math.cos(angle);
  const endY = centerY + loopRadius * Math.sin(angle);
  const arrowAngle = Math.PI / 6;
  const arrowHeadLength = 12;

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowHeadLength * Math.cos(angle - arrowAngle),
    endY - arrowHeadLength * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    endX - arrowHeadLength * Math.cos(angle + arrowAngle),
    endY - arrowHeadLength * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawArrowsBidirectional(
  ctx: CanvasRenderingContext2D,
  pairs: Array<{ from: number; to: number; label?: string }>,
  nodeStates: Array<{ x: number; y: number; r: number }>,
  color: string
) {
  const processed = new Set<string>();
  pairs.forEach((pair, pairIndex) => {
    if (processed.has(`${pairIndex}`)) return;
    const fromCircle = nodeStates[pair.from];
    const toCircle = nodeStates[pair.to];
    if (!fromCircle || !toCircle) return;

    const allBetween = pairs
      .map((p, idx) => ({ ...p, originalIndex: idx }))
      .filter(p =>
        (p.from === pair.from && p.to === pair.to) ||
        (p.from === pair.to && p.to === pair.from && pair.from !== pair.to)
      );
    allBetween.forEach(a => processed.add(`${a.originalIndex}`));

    const forwardArrows = allBetween.filter(p => p.from === pair.from && p.to === pair.to);
    const reverseArrows = allBetween.filter(p => p.from === pair.to && p.to === pair.from);

    if (pair.from === pair.to) {
      drawLoop(ctx, fromCircle, color);
      return;
    }

    if (forwardArrows.length >= 1 && reverseArrows.length > 0) {
      const minIndex = Math.min(pair.from, pair.to);
      const maxIndex = Math.max(pair.from, pair.to);
      const baseFrom = nodeStates[minIndex];
      const baseTo = nodeStates[maxIndex];
      if (!baseFrom || !baseTo) return;
      const baseOffset = Transition.calculateParallelOffset(baseFrom, baseTo, true);
      const forwardOffset = pair.from === minIndex ? baseOffset : { x: -baseOffset.x, y: -baseOffset.y };
      const reverseOffset = pair.from === minIndex ? { x: -baseOffset.x, y: -baseOffset.y } : baseOffset;
      drawArrow(
        ctx,
        { x: fromCircle.x + forwardOffset.x, y: fromCircle.y + forwardOffset.y, r: fromCircle.r },
        { x: toCircle.x + forwardOffset.x, y: toCircle.y + forwardOffset.y, r: toCircle.r },
        color
      );
      if (reverseArrows.length >= 1) {
        drawArrow(
          ctx,
          { x: toCircle.x + reverseOffset.x, y: toCircle.y + reverseOffset.y, r: toCircle.r },
          { x: fromCircle.x + reverseOffset.x, y: fromCircle.y + reverseOffset.y, r: fromCircle.r },
          color
        );
      }
    } else {
      drawArrow(ctx, fromCircle, toCircle, color);
    }
  });
}

export function drawTransitionLabels(
  ctx: CanvasRenderingContext2D,
  pairs: Array<{ from: number; to: number; label?: string }>,
  nodeStates: Array<{ x: number; y: number; r: number }>,
  style: TransitionLabelStyle
) {
  const grouped = new Map<string, { from: number; to: number; labels: string[] }>();

  pairs.forEach(pair => {
    const text = (pair.label ?? "").trim();
    if (!text) return;
    const key = `${pair.from}-${pair.to}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { from: pair.from, to: pair.to, labels: [text] });
      return;
    }
    if (!current.labels.includes(text)) {
      current.labels.push(text);
    }
  });

  grouped.forEach(entry => {
    const fromState = nodeStates[entry.from];
    const toState = nodeStates[entry.to];
    if (!fromState || !toState) return;

    const labelText = entry.labels.join(",");
    let x = (fromState.x + toState.x) / 2;
    let y = (fromState.y + toState.y) / 2;

    if (entry.from === entry.to) {
      x = fromState.x;
      y = fromState.y - fromState.r - 46;
    } else {
      const hasReverse = pairs.some(
        pair => pair.from === entry.to && pair.to === entry.from && pair.from !== pair.to
      );

      if (hasReverse) {
        const minIndex = Math.min(entry.from, entry.to);
        const maxIndex = Math.max(entry.from, entry.to);
        const baseFrom = nodeStates[minIndex];
        const baseTo = nodeStates[maxIndex];
        if (baseFrom && baseTo) {
          const baseOffset = Transition.calculateParallelOffset(baseFrom, baseTo, true);
          const isForward = entry.from === minIndex;
          const appliedOffset = isForward
            ? baseOffset
            : { x: -baseOffset.x, y: -baseOffset.y };
          x += appliedOffset.x * 1.6;
          y += appliedOffset.y * 1.6;
        }
      }
    }

    ctx.save();
    ctx.font = "600 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(labelText).width;
    const boxWidth = Math.max(20, textWidth + 10);
    const boxHeight = 18;

    ctx.beginPath();
    ctx.fillStyle = style.bgColor;
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 1.4;
    ctx.roundRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = style.baseColor;
    ctx.fillText(labelText, x, y + 0.5);
    ctx.restore();
  });
}
