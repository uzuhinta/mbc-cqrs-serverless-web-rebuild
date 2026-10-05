/** Inputs whose parse result must be identical under v0 (zod 3) and v1 (zod 4). */
export const COMPAT_INPUTS: Record<string, unknown> = {
  everyItemType: {
    title: '顧客満足度調査',
    description: 'ご協力ください',
    items: [
      {
        id: 'q_intro',
        type: 'short-text',
        label: 'お名前',
        validation: { required: true },
      },
      {
        id: 'sec_profile',
        type: 'section-header',
        title: 'プロフィール',
        description: '基本情報',
        locked: true,
        action: { type: 'jump', targetSectionId: 'sec_end' },
        legacyField: 'stripped',
      },
      {
        id: 'q_age',
        type: 'short-text',
        label: '年齢',
        validation: {
          required: true,
          custom: {
            type: 'number',
            rule: 'between',
            value: 18,
            value2: 65,
            customError: '18〜65',
          },
        },
      },
      {
        id: 'q_nan',
        type: 'short-text',
        label: 'NaN bounds',
        validation: { custom: { type: 'number', rule: 'gt', value: null } },
      },
      {
        id: 'q_mail',
        type: 'short-text',
        label: 'メール',
        locked: true,
        validation: { custom: { type: 'text', rule: 'is_email' } },
      },
      {
        id: 'q_bio',
        type: 'long-text',
        label: '自己紹介',
        validation: { custom: { type: 'length', rule: 'max', value: 200 } },
      },
      { id: 'q_scale', type: 'linear-scale', label: 'おすすめ度' },
      {
        id: 'q_scale_custom',
        type: 'linear-scale',
        label: 'Scale',
        min: 1,
        max: 5,
        minLabel: '低',
        maxLabel: '高',
      },
      {
        id: 'q_route',
        type: 'single-choice',
        label: '経路',
        options: [
          { value: 'a', label: 'A', nextSectionId: 'sec_end' },
          { value: 'other', label: 'その他', isOther: true },
        ],
        validation: { required: true, shuffleOptions: true },
      },
      {
        id: 'q_multi',
        type: 'multiple-choice',
        label: '複数',
        options: [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ],
        validation: { custom: { rule: 'max', value: 1 } },
      },
      {
        id: 'q_drop',
        type: 'dropdown',
        label: '選択',
        options: [{ value: 'd', label: 'D', nextSectionId: 'missing-section' }],
      },
      { id: 'q_rate', type: 'rating', label: '評価' },
      {
        id: 'q_rate2',
        type: 'rating',
        label: '評価2',
        levels: 10,
        symbol: 'heart',
      },
      { id: 'q_date', type: 'date', label: '日付' },
      {
        id: 'q_date2',
        type: 'date',
        label: '日時',
        includeTime: true,
        includeYear: false,
      },
      { id: 'q_time', type: 'time', label: '時刻' },
      { id: 'q_dur', type: 'time', label: '所要時間', answerType: 'duration' },
      {
        id: 'sec_end',
        type: 'section-header',
        title: '終わり',
        action: { type: 'submit' },
      },
    ],
  },
  noLeadingHeader: {
    title: 'No header',
    items: [{ id: 'q1', type: 'short-text', label: 'Q1' }],
  },
  optionWithUnknownKey: {
    title: 'Strict options',
    items: [
      {
        id: 'q1',
        type: 'single-choice',
        label: 'Q',
        options: [{ value: 'a', label: 'A', color: 'red' }],
      },
    ],
  },
  duplicateIds: {
    title: 'Dupes',
    items: [
      { id: 'q1', type: 'short-text', label: 'A' },
      { id: 'q1', type: 'long-text', label: 'B' },
    ],
  },
  jumpWithExtraKey: {
    title: 'Jump',
    items: [
      {
        id: 's1',
        type: 'section-header',
        title: 'S',
        action: { type: 'submit', extra: 1 },
      },
    ],
  },
  emptyOptionLabel: {
    title: 'Empty',
    items: [
      {
        id: 'q',
        type: 'dropdown',
        label: 'Q',
        options: [{ value: 'v', label: '' }],
      },
    ],
  },
  notAnObject: 'survey',
  nullInput: null,
}
