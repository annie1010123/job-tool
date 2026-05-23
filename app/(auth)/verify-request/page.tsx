export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-zinc-100 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl">
          📬
        </div>
        <h1 className="text-lg font-semibold text-zinc-900 mb-2">確認您的 Email</h1>
        <p className="text-sm text-zinc-500">
          登入連結已寄出。請檢查您的信箱並點擊連結完成登入。
        </p>
      </div>
    </div>
  );
}
