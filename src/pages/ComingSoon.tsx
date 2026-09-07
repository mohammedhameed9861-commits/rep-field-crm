export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-bold text-sea-800">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Not built yet — this section comes after Accounts.
      </p>
    </div>
  );
}
