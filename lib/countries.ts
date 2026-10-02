/**
 * ISO 3166-1 alpha-2 codes, with names resolved by Intl rather than stored.
 *
 * Only the codes are data here -- about 500 bytes. `Intl.DisplayNames` turns
 * them into names the browser already has, in the reader's own language, and
 * a hand-kept table of 250 country names is a table of 250 names to argue
 * about and forget to update.
 */
const CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ " +
  "BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR " +
  "CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU " +
  "ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ " +
  "LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ " +
  "MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF " +
  "PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI " +
  "SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR " +
  "TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW";

export type Country = { code: string; name: string };

/** Sorted by name in the given locale, so a picker reads correctly anywhere. */
export function countries(locale = "en"): Country[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return CODES.split(" ")
    .map((code) => {
      let name = code;
      try {
        name = names.of(code) ?? code;
      } catch {
        /* an unknown code keeps its code as the label */
      }
      return { code, name };
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function isCountryCode(value: string): boolean {
  return CODES.includes(value.toUpperCase());
}
