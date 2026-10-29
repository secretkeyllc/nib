/**
 * The tile that leads an AI service (D625).
 *
 * Deliberately no brand artwork or colour: every service sits in the same
 * quiet raised tone, so a row is told apart by its name and the tile only gives
 * the eye a column to scan. A name without a letter or digit gets the generic
 * server glyph instead.
 *
 * The one exception is the product's own account: Nib's row is not a service
 * the user configured, so it carries the app mark rather than a letter — the
 * same mark the sidebar and the installer use.
 */
import { BrandLogo } from "../BrandLogo";
import { IconServer } from "../icons";
import { monogramLetter } from "./service-row-status";

export function ServiceMonogram({
  name,
  bundled = false,
}: {
  name: string;
  /** A row the app ships with (Nib itself) rather than one the user added. */
  bundled?: boolean;
}) {
  if (bundled) {
    return (
      <span className="service-monogram is-brand" aria-hidden>
        <BrandLogo size={16} />
      </span>
    );
  }
  const letter = monogramLetter(name);
  return (
    <span className="service-monogram" aria-hidden>
      {letter || <IconServer size={14} />}
    </span>
  );
}
