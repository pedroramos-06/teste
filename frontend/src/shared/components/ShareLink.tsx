import { Check, Link } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Ripples } from "react-ripples-continued";

export default function ShareLink() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }

    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1800);
  };

  const handleClick = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch (error) {
        const wasDismissed = error instanceof DOMException && error.name === "AbortError";
        if (!wasDismissed) await copyToClipboard(url);
      }
      return;
    }

    await copyToClipboard(url);
  };

  return (
    <button type="button" className="icon-btn" onClick={handleClick} aria-label="Compartilhar link">
      {copied ? <Check className="text-primary" size={24} /> : <Link className="text-neutral-dark" size={24} />}
      <Ripples color="var(--ripple-dark)" />
    </button>
  );
}