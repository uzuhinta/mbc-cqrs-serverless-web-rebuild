import { defineMessages } from '@mbc-cqrs-serverless/ui-web'

import type { QuestionKind } from '../../schema/survey-schema'

export type CreatorMessages = {
  shell: {
    creatorTab: string
    previewTab: string
    jsonTab: string
    jsonTitle: string
    previewSubmitted: string
    untitledSurvey: string
    surveyTitlePlaceholder: string
    surveyDescriptionPlaceholder: string
    firstSection: string
    newSection: (params: { n: number }) => string
    copySuffix: string
  }
  toolbar: {
    label: string
    addQuestion: string
    addQuestionLocked: string
    importQuestions: string
    addTitle: string
    addSection: string
    addSectionAfterLocked: string
  }
  question: {
    placeholder: string
    newQuestion: string
    descriptionPlaceholder: string
    type: string
    duplicate: string
    delete: string
    required: string
    more: string
    show: string
    description: string
    responseValidation: string
    shuffleOptions: string
    branching: string
    includeTime: string
    includeYear: string
    answerType: string
    answerTime: string
    answerDuration: string
    locked: string
    dragHandle: string
  }
  kinds: Record<QuestionKind, string>
  preview: {
    shortText: string
    longText: string
    moreOptions: (params: { count: number }) => string
    shuffled: string
    dateWithYear: string
    dateNoYear: string
    time: string
  }
  rules: {
    type: string
    rule: string
    number: string
    text: string
    length: string
    regex: string
    gt: string
    gte: string
    lt: string
    lte: string
    eq: string
    neq: string
    between: string
    notBetween: string
    isNumber: string
    isWhole: string
    contains: string
    notContains: string
    isEmail: string
    isUrl: string
    maxLength: string
    minLength: string
    matches: string
    notMatches: string
    value: string
    and: string
    customError: string
    close: string
    choiceRule: string
    atLeast: string
    atMost: string
    exactly: string
    count: string
  }
  options: {
    title: string
    placeholder: (params: { n: number }) => string
    add: string
    addOther: string
    removeOther: string
    other: string
    goToSection: string
    defaultNext: string
    remove: string
    reorder: string
    /** The option's stored value, edited apart from its label (v0 0.0.50). */
    value: string
  }
  scale: {
    to: string
    labelPlaceholder: string
    min: string
    max: string
  }
  rating: {
    levels: string
    symbol: string
    star: string
    heart: string
    thumb: string
  }
  section: {
    tab: (params: { n: number; total: number }) => string
    untitled: string
    descriptionPlaceholder: string
    menu: string
    move: string
    duplicate: string
    merge: string
    delete: string
    containsLocked: string
    deleteTitle: string
    deleteDescription: string
    deleteHint: string
    cancel: string
    confirmDelete: string
    locked: string
    expand: string
    collapse: string
  }
  action: {
    after: (params: { n: number }) => string
    continueNext: string
    goTo: (params: { n: number; title: string }) => string
    submit: string
  }
  reorder: {
    title: string
    position: (params: { n: number; total: number }) => string
    save: string
    cancel: string
  }
  dnd: {
    /** Replaces "button" in what screen readers say for a drag handle. */
    roleDescription: string
    instructions: string
    pickedUp: (params: { label: string }) => string
    movedOver: (params: { label: string; over: string }) => string
    dropped: (params: { label: string; over: string }) => string
    droppedNowhere: (params: { label: string }) => string
    cancelled: (params: { label: string }) => string
  }
  errors: {
    surveyTitle: string
    sectionTitle: string
    options: string
    optionLabel: string
    optionValue: string
    optionValueEmpty: string
    validationRule: string
    duplicateId: string
    invalid: string
    missingTarget: string
  }
}

declare module '@mbc-cqrs-serverless/ui-web' {
  interface MbcMessageRegistry {
    surveyCreator: CreatorMessages
  }
}

const ja: CreatorMessages = {
  shell: {
    creatorTab: '作成者',
    previewTab: 'プレビュー',
    jsonTab: 'JSON',
    jsonTitle: 'ライブJSON出力',
    previewSubmitted: 'プレビューが送信されました。',
    untitledSurvey: '未タイトル調査',
    surveyTitlePlaceholder: 'アンケートのタイトル',
    surveyDescriptionPlaceholder: 'フォームの説明',
    firstSection: '最初のセクション',
    newSection: ({ n }) => `セクション ${n}`,
    copySuffix: '（コピー）',
  },
  toolbar: {
    label: '項目を追加',
    addQuestion: '質問を追加',
    addQuestionLocked: 'ロックされたセクションには質問を追加できません',
    importQuestions: '質問をインポート (将来実装予定)',
    addTitle: 'タイトルと説明を追加 (将来実装予定)',
    addSection: 'セクションを追加',
    addSectionAfterLocked: 'ロックされたセクションの後にセクションを追加',
  },
  question: {
    placeholder: '質問',
    newQuestion: '新しい質問',
    descriptionPlaceholder: '説明',
    type: '質問の種類',
    duplicate: '複製',
    delete: '削除',
    required: '必須',
    more: 'その他のオプション',
    show: '表示',
    description: '説明',
    responseValidation: '回答の検証',
    shuffleOptions: 'オプションをシャッフル',
    branching: '回答に基づいてセクションに移動',
    includeTime: '時間を含む',
    includeYear: '年を含む',
    answerType: '回答の種類',
    answerTime: '時刻',
    answerDuration: '期間',
    locked: 'ロックされた質問',
    dragHandle: 'ドラッグして並べ替え',
  },
  kinds: {
    'short-text': '短文回答',
    'long-text': '段落',
    'single-choice': 'ラジオボタン',
    'multiple-choice': 'チェックボックス',
    dropdown: 'プルダウン',
    'linear-scale': '均等目盛',
    rating: '評価',
    date: '日付',
    time: '時刻',
  },
  preview: {
    shortText: '短文回答',
    longText: '長文回答 (段落)',
    moreOptions: ({ count }) => `+${count} 個の追加オプション`,
    shuffled: ' (シャッフル)',
    dateWithYear: '年月日',
    dateNoYear: '年月',
    time: '時間',
  },
  rules: {
    type: 'タイプ...',
    rule: 'ルール...',
    number: '数値',
    text: 'テキスト',
    length: '長さ',
    regex: '正規表現',
    gt: 'より大きい',
    gte: '以上',
    lt: 'より小さい',
    lte: '以下',
    eq: '等しい',
    neq: '等しくない',
    between: '範囲内',
    notBetween: '範囲外',
    isNumber: '数字',
    isWhole: '整数',
    contains: '含む',
    notContains: '含まない',
    isEmail: 'メールアドレス',
    isUrl: 'URL',
    maxLength: '最大文字数',
    minLength: '最小文字数',
    matches: '一致する',
    notMatches: '一致しない',
    value: '値',
    and: 'かつ',
    customError: 'カスタムエラーテキスト',
    close: '回答の検証を閉じる',
    choiceRule: 'ルールを選択...',
    atLeast: '最低でも',
    atMost: '最大でも',
    exactly: '正確に',
    count: '数値',
  },
  options: {
    title: 'オプション',
    placeholder: ({ n }) => `オプション ${n}`,
    add: 'オプションを追加',
    addOther: 'その他を追加',
    removeOther: 'その他を削除',
    other: 'その他',
    goToSection: 'セクションに移動...',
    defaultNext: 'デフォルト (次のセクション)',
    remove: 'オプションを削除',
    reorder: 'ドラッグしてオプションを並べ替え',
    value: '値',
  },
  scale: {
    to: '〜',
    labelPlaceholder: 'ラベル（任意)',
    min: '最小値',
    max: '最大値',
  },
  rating: {
    levels: '段階数',
    symbol: '記号',
    star: '星',
    heart: '心',
    thumb: '拇指',
  },
  section: {
    tab: ({ n, total }) => `セクション ${n} / ${total}`,
    untitled: '未タイトルセクション',
    descriptionPlaceholder: '説明 (任意)',
    menu: 'セクションのオプション',
    move: 'セクションを移動',
    duplicate: 'セクションを複製',
    merge: '上のセクションとマージ',
    delete: 'セクションを削除',
    containsLocked: '(ロックされた質問を含む)',
    deleteTitle: '質問とセクションを削除しますか？',
    deleteDescription:
      'セクションを削除すると、それに含まれるすべての質問も削除されます。この操作は元に戻すことができません。',
    deleteHint:
      '質問を保持するには、セクションオプションから "上のセクションとマージ" を選択してください。',
    cancel: 'キャンセル',
    confirmDelete: '削除',
    locked: 'ロックされたセクション',
    expand: 'セクションを編集',
    collapse: 'セクションを閉じる',
  },
  action: {
    after: ({ n }) => `${n} セクション後`,
    continueNext: '次のセクションに進む',
    goTo: ({ n, title }) => `${n} セクションに移動 (${title})`,
    submit: 'フォームを送信',
  },
  reorder: {
    title: 'セクションを移動',
    position: ({ n, total }) => `セクション ${n} / ${total}`,
    save: '保存',
    cancel: 'キャンセル',
  },
  dnd: {
    roleDescription: '並べ替え可能',
    instructions:
      'スペースキーで項目を持ち上げ、矢印キーで移動し、もう一度スペースキーで置きます。Escape キーで取り消します。',
    pickedUp: ({ label }) => `「${label}」を持ち上げました。`,
    movedOver: ({ label, over }) =>
      `「${label}」を「${over}」の位置に移動しました。`,
    dropped: ({ label, over }) =>
      `「${label}」を「${over}」の位置に置きました。`,
    droppedNowhere: ({ label }) => `「${label}」を元の位置に戻しました。`,
    cancelled: ({ label }) => `「${label}」の移動を取り消しました。`,
  },
  errors: {
    surveyTitle: 'アンケートのタイトルを入力してください',
    sectionTitle: 'セクションのタイトルを入力してください',
    options: 'オプションを1つ以上追加してください',
    optionLabel: 'オプションのラベルを入力してください',
    optionValue: 'オプションの値が重複しているか、予約された値（other）です',
    optionValueEmpty: 'オプションの値を入力してください',
    validationRule: '回答の検証ルールを完成させてください',
    duplicateId: 'IDが重複しています',
    invalid: '入力内容を確認してください',
    missingTarget: '移動先のセクションが見つかりません',
  },
}

const en: CreatorMessages = {
  shell: {
    creatorTab: 'Creator',
    previewTab: 'Preview',
    jsonTab: 'JSON',
    jsonTitle: 'Live JSON output',
    previewSubmitted: 'The preview was submitted.',
    untitledSurvey: 'Untitled survey',
    surveyTitlePlaceholder: 'Survey title',
    surveyDescriptionPlaceholder: 'Form description',
    firstSection: 'First section',
    newSection: ({ n }) => `Section ${n}`,
    copySuffix: ' (Copy)',
  },
  toolbar: {
    label: 'Add items',
    addQuestion: 'Add question',
    addQuestionLocked: 'Questions cannot be added to a locked section',
    importQuestions: 'Import questions (coming soon)',
    addTitle: 'Add title and description (coming soon)',
    addSection: 'Add section',
    addSectionAfterLocked: 'Add a section after the locked section',
  },
  question: {
    placeholder: 'Question',
    newQuestion: 'New question',
    descriptionPlaceholder: 'Description',
    type: 'Question type',
    duplicate: 'Duplicate',
    delete: 'Delete',
    required: 'Required',
    more: 'More options',
    show: 'Show',
    description: 'Description',
    responseValidation: 'Response validation',
    shuffleOptions: 'Shuffle option order',
    branching: 'Go to section based on answer',
    includeTime: 'Include time',
    includeYear: 'Include year',
    answerType: 'Answer type',
    answerTime: 'Time',
    answerDuration: 'Duration',
    locked: 'Locked question',
    dragHandle: 'Drag to reorder',
  },
  kinds: {
    'short-text': 'Short answer',
    'long-text': 'Paragraph',
    'single-choice': 'Multiple choice',
    'multiple-choice': 'Checkboxes',
    dropdown: 'Dropdown',
    'linear-scale': 'Linear scale',
    rating: 'Rating',
    date: 'Date',
    time: 'Time',
  },
  preview: {
    shortText: 'Short answer text',
    longText: 'Long answer text',
    moreOptions: ({ count }) => `+${count} more options`,
    shuffled: ' (shuffled)',
    dateWithYear: 'Month, day, year',
    dateNoYear: 'Month, day',
    time: 'Time',
  },
  rules: {
    type: 'Type...',
    rule: 'Rule...',
    number: 'Number',
    text: 'Text',
    length: 'Length',
    regex: 'Regular expression',
    gt: 'Greater than',
    gte: 'Greater than or equal to',
    lt: 'Less than',
    lte: 'Less than or equal to',
    eq: 'Equal to',
    neq: 'Not equal to',
    between: 'Between',
    notBetween: 'Not between',
    isNumber: 'Is number',
    isWhole: 'Whole number',
    contains: 'Contains',
    notContains: "Doesn't contain",
    isEmail: 'Email address',
    isUrl: 'URL',
    maxLength: 'Maximum character count',
    minLength: 'Minimum character count',
    matches: 'Matches',
    notMatches: "Doesn't match",
    value: 'Value',
    and: 'and',
    customError: 'Custom error text',
    close: 'Close response validation',
    choiceRule: 'Select a rule...',
    atLeast: 'Select at least',
    atMost: 'Select at most',
    exactly: 'Select exactly',
    count: 'Number',
  },
  options: {
    title: 'Options',
    placeholder: ({ n }) => `Option ${n}`,
    add: 'Add option',
    addOther: 'Add "Other"',
    removeOther: 'Remove "Other"',
    other: 'Other',
    goToSection: 'Go to section...',
    defaultNext: 'Default (next section)',
    remove: 'Remove option',
    reorder: 'Drag to reorder options',
    value: 'Value',
  },
  scale: {
    to: 'to',
    labelPlaceholder: 'Label (optional)',
    min: 'Minimum',
    max: 'Maximum',
  },
  rating: {
    levels: 'Levels',
    symbol: 'Symbol',
    star: 'Star',
    heart: 'Heart',
    thumb: 'Thumb',
  },
  section: {
    tab: ({ n, total }) => `Section ${n} of ${total}`,
    untitled: 'Untitled section',
    descriptionPlaceholder: 'Description (optional)',
    menu: 'Section options',
    move: 'Move section',
    duplicate: 'Duplicate section',
    merge: 'Merge with above',
    delete: 'Delete section',
    containsLocked: '(contains locked questions)',
    deleteTitle: 'Delete questions and section?',
    deleteDescription:
      'Deleting a section also deletes all questions it contains. This action cannot be undone.',
    deleteHint:
      'To keep the questions, choose "Merge with above" from the section options instead.',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    locked: 'Locked section',
    expand: 'Edit section',
    collapse: 'Close section',
  },
  action: {
    after: ({ n }) => `After section ${n}`,
    continueNext: 'Continue to next section',
    goTo: ({ n, title }) => `Go to section ${n} (${title})`,
    submit: 'Submit form',
  },
  reorder: {
    title: 'Reorder sections',
    position: ({ n, total }) => `Section ${n} of ${total}`,
    save: 'Save',
    cancel: 'Cancel',
  },
  dnd: {
    roleDescription: 'sortable',
    instructions:
      'Press Space to pick up an item, use the arrow keys to move it, and press Space again to drop it. Press Escape to cancel.',
    pickedUp: ({ label }) => `Picked up "${label}".`,
    movedOver: ({ label, over }) =>
      `"${label}" moved to the position of "${over}".`,
    dropped: ({ label, over }) =>
      `"${label}" dropped at the position of "${over}".`,
    droppedNowhere: ({ label }) => `"${label}" returned to its place.`,
    cancelled: ({ label }) => `Moving "${label}" was cancelled.`,
  },
  errors: {
    surveyTitle: 'Enter a survey title',
    sectionTitle: 'Enter a section title',
    options: 'Add at least one option',
    optionLabel: 'Enter a label for every option',
    optionValue: 'Option values must be unique and cannot be "other"',
    optionValueEmpty: 'Enter a value for every option',
    validationRule: 'Complete the response validation rule',
    duplicateId: 'This id is used twice',
    invalid: 'Check this item',
    missingTarget: 'The target section no longer exists',
  },
}

export const creatorMessages = defineMessages('surveyCreator', { ja, en })
