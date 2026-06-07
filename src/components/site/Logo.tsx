import Image from "next/image";
import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="FightVex"
        width={226}
        height={32}
        sizes="226px"
        quality={100}
        className="fv-logo h-8 w-auto object-contain"
        priority
      />
    </Link>
  );
}
