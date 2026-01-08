// 부드러운 이동을 위한 easing 함수
export function easeInOut(t) {
	return t * t * (3 - 2 * t);
}
