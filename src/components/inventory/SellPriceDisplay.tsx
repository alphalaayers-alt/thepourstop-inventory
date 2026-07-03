"use client";

import { useState } from "react";
import type { SellableItem } from "@/types/inventory";
import { formatMoney, formatSellPrice } from "@/lib/format";
import { getBillingPourOptions, getBasePegMl } from "@/lib/pour-sizes";
import { SellPricesModal } from "@/components/inventory/SellPricesModal";

interface SellPriceDisplayProps {
  item: Pick<
    SellableItem,
    "name" | "unitType" | "sellPrice" | "servingSizeMl" | "pourSizes" | "category"
  >;
}

function getBasePourOption(
  item: Pick<SellableItem, "unitType" | "sellPrice" | "servingSizeMl" | "pourSizes">
) {
  const options = getBillingPourOptions(item);
  const basePegMl = getBasePegMl(item);
  const baseOption =
    options.find((o) => !o.isCombo && o.pours === 1 && o.ml === basePegMl) ??
    options.find((o) => !o.isCombo && o.pours === 1) ??
    options[0];

  const extraOptions = baseOption
    ? options.filter((o) => o.key !== baseOption.key)
    : options.slice(1);

  return { baseOption, extraOptions };
}

export function SellPriceDisplay({ item }: SellPriceDisplayProps) {
  const [showPricesModal, setShowPricesModal] = useState(false);

  if (item.unitType !== "pour") {
    return (
      <>
        <p className="text-base font-bold text-emerald-700">{formatSellPrice(item)}</p>
        <span className="mt-1 block h-4" aria-hidden="true" />
      </>
    );
  }

  const { baseOption, extraOptions } = getBasePourOption(item);
  const basePrice = baseOption?.price ?? item.sellPrice;
  const baseLabel = baseOption?.label ?? `${getBasePegMl(item)}ml`;

  return (
    <>
      <p className="text-base font-bold text-emerald-700">{formatMoney(basePrice)}</p>

      {extraOptions.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowPricesModal(true)}
          className="mt-1 block h-4 text-xs font-medium leading-4 text-emerald-800/80 underline-offset-2 hover:text-emerald-900 hover:underline"
        >
          See more prices
        </button>
      ) : (
        <span className="mt-1 block h-4" aria-hidden="true" />
      )}

      {showPricesModal && (
        <SellPricesModal
          itemName={item.name}
          basePrice={basePrice}
          baseLabel={baseLabel}
          extraOptions={extraOptions}
          onClose={() => setShowPricesModal(false)}
        />
      )}
    </>
  );
}
