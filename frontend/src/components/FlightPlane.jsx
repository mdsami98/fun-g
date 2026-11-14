import planePng from '../images/plane.png';

/**
 * The Aviator Plane matching user's custom design screenshot.
 * The tail-bottom of the plane sits at (0, 0) and climbs along the tangent.
 */
export function FlightPlane() {
  return (
    <g className="aviator-plane">
      <g className="aviator-plane-body">
        {/* Plane image placed so the tail tip directly touches the curve apex (0, 0) without any gap */}
        <image
          href={planePng}
          x="-1"
          y="-53"
          width="112"
          height="59"
          preserveAspectRatio="xMidYMid meet"
          className="aviator-plane-img"
        />
      </g>
    </g>
  );
}
