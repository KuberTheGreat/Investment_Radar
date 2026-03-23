// Small cn utility — avoids needing clsx/class-variance-authority dependency
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}
