import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@mbc-cqrs-serverless/ui-web'
import type { ReactNode } from 'react'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 12, padding: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>{title}</h2>
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'start',
        }}
      >
        {children}
      </div>
    </section>
  )
}

export function Gallery() {
  return (
    <div data-mbc="" style={{ maxWidth: 960, margin: '0 auto' }}>
      <Section title="Button">
        <Button>保存する</Button>
        <Button variant="outline">キャンセル</Button>
        <Button variant="secondary">下書き</Button>
        <Button variant="ghost">戻る</Button>
        <Button variant="destructive">削除</Button>
        <Button variant="link">詳細を見る</Button>
        <Button size="sm">小</Button>
        <Button size="lg">大きいボタン</Button>
        <Button loading>保存中</Button>
        <Button disabled>無効</Button>
      </Section>
      <Section title="Field + Input / Textarea">
        <div style={{ display: 'grid', gap: 16, width: 320 }}>
          <Field>
            <FieldLabel required>メールアドレス</FieldLabel>
            <Input type="email" placeholder="name@example.com" />
            <FieldDescription>
              業務用のアドレスを入力してください。
            </FieldDescription>
          </Field>
          <Field invalid>
            <FieldLabel>
              とても長いラベルが二行に折り返されるかどうかを確認するための質問タイトル
            </FieldLabel>
            <Input defaultValue="abc" />
            <FieldError>5文字以上で入力してください。</FieldError>
          </Field>
          <Input showSearchIcon placeholder="検索" />
          <Input disabled placeholder="無効" />
          <Field>
            <FieldLabel>備考</FieldLabel>
            <Textarea placeholder="自由記述" />
          </Field>
        </div>
      </Section>
      <Section title="Checkbox / RadioGroup / Switch">
        <Field>
          <FieldLabel>同意する</FieldLabel>
          <Checkbox defaultChecked />
        </Field>
        <Checkbox disabled aria-label="disabled" />
        <Field>
          <FieldLabel>色</FieldLabel>
          <RadioGroup defaultValue="red">
            <RadioGroupItem value="red" aria-label="赤" />
            <RadioGroupItem value="blue" aria-label="青" />
            <RadioGroupItem value="green" aria-label="緑" disabled />
          </RadioGroup>
        </Field>
        <Field>
          <FieldLabel>通知</FieldLabel>
          <Switch defaultChecked />
        </Field>
      </Section>
      <Section title="Select">
        <Field>
          <FieldLabel>果物</FieldLabel>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">りんご</SelectItem>
              <SelectItem value="pear" disabled>
                なし（在庫切れ）
              </SelectItem>
              <SelectItem value="long">
                とても長い選択肢の名前がどのように表示されるかを確認するための項目
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>
      <Section title="Overlays">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">ダイアログ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>アンケートを編集</DialogTitle>
              <DialogDescription>
                タイトルと説明を変更できます。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">削除</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction>削除する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">ポップオーバー</Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar mode="single" />
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">メニュー</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>質問</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>複製</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">削除</DropdownMenuItem>
            <DropdownMenuCheckboxItem checked>必須</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem disabled>
              ロック中
            </DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="a">
              <DropdownMenuRadioItem value="a">選択肢A</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="b">選択肢B</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>
      <Section title="Tabs">
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">編集</TabsTrigger>
            <TabsTrigger value="preview">プレビュー</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">編集画面</TabsContent>
          <TabsContent value="preview">プレビュー画面</TabsContent>
        </Tabs>
      </Section>
      <Section title="Card / Alert / Badge / Skeleton / Separator">
        <Card style={{ width: 300 }}>
          <CardHeader>
            <CardTitle>顧客満足度調査 2026</CardTitle>
            <CardDescription>説明なし</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">2026/10/04</Badge>
          </CardContent>
        </Card>
        <div style={{ display: 'grid', gap: 12, width: 300 }}>
          <Alert>
            <AlertTitle>保存しました</AlertTitle>
            <AlertDescription>変更内容が反映されました。</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>保存に失敗しました</AlertTitle>
            <AlertDescription>
              通信状態を確認して再度お試しください。
            </AlertDescription>
          </Alert>
          <Skeleton style={{ height: 20 }} />
          <Separator />
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge>既定</Badge>
            <Badge variant="secondary">0件</Badge>
            <Badge variant="destructive">エラー</Badge>
            <Badge variant="outline">123,456,789</Badge>
          </div>
        </div>
      </Section>
      <Section title="Calendar">
        <Calendar
          mode="single"
          defaultMonth={new Date(2026, 9, 1)}
          selected={new Date(2026, 9, 15)}
        />
      </Section>
      <Section title="Pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">99</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>
    </div>
  )
}
