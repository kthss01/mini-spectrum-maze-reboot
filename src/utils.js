// 이동 애니메이션을 위한 easing 함수
export function easeInOut(t) {
	return t * t * (3 - 2 * t);
}
