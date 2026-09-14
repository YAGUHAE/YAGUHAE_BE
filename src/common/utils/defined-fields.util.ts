/**
 * DTO에서 **실제로 전달된** 필드만 남긴다.
 *
 * tsconfig의 target이 ES2023이라 useDefineForClassFields가 켜지고, DTO의 선언만
 * 있는 필드가 런타임 클래스 필드로 만들어진다. 그래서 `{ nickname }` 하나만 보낸
 * 요청도 ValidationPipe를 지나면 나머지 키가 `undefined` 값으로 **존재한다.**
 *
 * 그대로 Object.assign 하면 DB는 무사하지만(TypeORM이 undefined를 "변경 없음"으로
 * 본다) 메모리의 엔티티가 오염돼 응답 DTO가 그 필드를 잃는다 — JSON.stringify가
 * undefined 키를 지우기 때문에 PATCH 응답이 DTO 계약을 어긴다.
 *
 * 부분 업데이트(PATCH)를 하는 모든 서비스가 같은 함정을 밟으므로 공통으로 둔다.
 */
export function definedFieldsOf<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
