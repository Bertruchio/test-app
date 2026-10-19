import { Match, MatchesResponse, MatchFilter, MatchScore } from '../types/match';

/**
 * Валидирует и приводит сырой JSON-ответ сервера к типизированной структуре `MatchesResponse`.
 *
 * @param raw - Неизвестные данные, полученные из `response.json()`.
 * @returns Объект с номером тура `round` и массивом матчей `matches`.
 * @throws {Error} Если ответ не является объектом или поле `matches` не является массивом.
 */
export function parseMatchesResponse(raw: unknown): MatchesResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Некорректный формат ответа сервера');
  }

  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.matches)) {
    throw new Error('Поле matches отсутствует или не является массивом');
  }

  const round = typeof record.round === 'number' ? record.round : 1;
  return {
    round,
    matches: record.matches as Match[],
  };
}

/**
 * Проверяет наличие валидного числового счёта у матча.
 * Использует строгую проверку типа `number`, чтобы нулевой счёт (`0:0`)
 * не отбрасывался как `falsy`-значение.
 *
 * @param score - Объект счёта матча или `null`/`undefined`.
 * @returns `true`, если оба значения счёта (`home` и `away`) являются числами.
 */
export function hasScore(score: MatchScore | null | undefined): score is MatchScore {
  return (
    score !== null &&
    score !== undefined &&
    typeof score.home === 'number' &&
    typeof score.away === 'number'
  );
}

/**
 * Форматирует счёт матча в строку вида `"2 : 1"` или `"0 : 0"`.
 *
 * @param score - Объект счёта матча или `null`/`undefined` (если матч ещё не начался).
 * @returns Строка со счётом или `null`, если счёт отсутствует.
 */
export function formatScore(score: MatchScore | null | undefined): string | null {
  if (!hasScore(score)) {
    return null;
  }
  return `${score.home} : ${score.away}`;
}

/**
 * Форматирует ISO-дату начала матча в локальном часовом поясе устройства.
 * Безопасно обрабатывает `startsAt === null` (например, у перенесённых матчей),
 * предотвращая появление `1 января 1970` при вызове `new Date(null)`.
 *
 * @param startsAt - ISO-строка даты начала матча или `null`.
 * @returns Локализованная строка даты и времени (например, `"11 окт., 16:00"`) либо `"Дата уточняется"`.
 */
export function formatMatchDateTime(startsAt: string | null | undefined): string {
  if (!startsAt) {
    return 'Дата уточняется';
  }

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return 'Дата уточняется';
  }

  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Цветовой тон бейджа статуса матча для оформления карточки. */
export type StatusTone = 'finished' | 'live' | 'upcoming' | 'postponed' | 'neutral';

/** Локализованная информация о статусе матча. */
export type StatusInfo = {
  /** Текст статуса на русском языке (с учётом текущей минуты для `live`). */
  label: string;
  /** Визуальный тон бейджа. */
  tone: StatusTone;
};

/**
 * Возвращает русскоязычную подпись и цветовой тон для статуса матча.
 * Для матчей в статусе `live` дополнительно подставляет текущую минуту, если она передана.
 *
 * @param match - Объект матча (или его поля `status` и `minute`).
 * @returns Объект `StatusInfo` с текстом статуса и тоном оформления.
 */
export function getStatusInfo(match: Pick<Match, 'status' | 'minute'>): StatusInfo {
  switch (match.status) {
    case 'finished':
      return { label: 'Завершён', tone: 'finished' };
    case 'live':
      return {
        label:
          typeof match.minute === 'number'
            ? `Идёт матч • ${match.minute}'`
            : 'Идёт матч',
        tone: 'live',
      };
    case 'scheduled':
      return { label: 'Предстоит', tone: 'upcoming' };
    case 'postponed':
      return { label: 'Перенесён', tone: 'postponed' };
    default:
      return { label: 'Статус уточняется', tone: 'neutral' };
  }
}

/**
 * Проверяет, подходит ли матч под выбранную вкладку фильтра по статусу:
 * - `'all'` — все матчи тура (`scheduled`, `postponed`, `live`, `finished`);
 * - `'upcoming'` — запланированные (`scheduled`) и перенесённые (`postponed`),
 *   так как перенесённая встреча ещё не сыграна и состоится позже;
 * - `'finished'` — только завершённые (`finished`).
 *
 * Матч в статусе `'live'` уже идёт прямо сейчас, поэтому отображается во вкладке «Все».
 *
 * @param match - Проверяемый матч.
 * @param filter - Активный фильтр (`'all' | 'upcoming' | 'finished'`).
 * @returns `true`, если матч соответствует фильтру.
 */
export function matchesStatusFilter(match: Match, filter: MatchFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'upcoming':
      return match.status === 'scheduled' || match.status === 'postponed';
    case 'finished':
      return match.status === 'finished';
  }
}

/**
 * Фильтрует список матчей по выбранной вкладке статуса и поисковому запросу
 * (по названию клуба или городу хозяев/гостей без учёта регистра).
 *
 * @param matches - Исходный массив матчей тура.
 * @param filter - Выбранный фильтр статуса (`'all' | 'upcoming' | 'finished'`).
 * @param searchQuery - Поисковая строка по названию команды или городу (по умолчанию `''`).
 * @returns Отфильтрованный массив матчей.
 */
export function filterMatches(
  matches: Match[],
  filter: MatchFilter,
  searchQuery = ''
): Match[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return matches.filter((match) => {
    if (!matchesStatusFilter(match, filter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const homeName = match.home.name.toLowerCase();
    const awayName = match.away.name.toLowerCase();
    const homeCity = match.home.city.toLowerCase();
    const awayCity = match.away.city.toLowerCase();

    return (
      homeName.includes(normalizedQuery) ||
      awayName.includes(normalizedQuery) ||
      homeCity.includes(normalizedQuery) ||
      awayCity.includes(normalizedQuery)
    );
  });
}