<?php
declare(strict_types=1);

namespace App;

use DomainException;

final class PricingCalculator
{
    public static function rawPurchase(array $data): array
    {
        self::positive($data['quantity'] ?? null, 'Quantity');
        self::nonNegative($data['purchase_price'] ?? null, 'Purchase price');
        self::percentage($data['wastage_percent'] ?? null, 'Wastage', false);
        $quantity = (float) $data['quantity'];
        $price = (float) $data['purchase_price'];
        $usable = self::round($quantity * (1 - ((float) $data['wastage_percent'] / 100)));
        if ($usable <= 0) throw new DomainException('Usable quantity must be greater than zero.');
        if (($data['unit'] ?? '') === 'Piece') return compact('usable') + ['cost_per_kg' => null, 'cost_per_gram' => null, 'cost_per_piece' => self::round($price / $usable)];
        $grams = self::grams($usable, (string) $data['unit']);
        $perGram = self::round($price / $grams, 6);
        return ['usable' => $usable, 'cost_per_kg' => self::round($perGram * 1000), 'cost_per_gram' => $perGram, 'cost_per_piece' => null];
    }

    public static function packagingPurchase(array $data): array
    {
        self::positive($data['quantity'] ?? null, 'Packaging quantity');
        foreach (['purchase_cost' => 'Purchase cost', 'shipping_cost' => 'Shipping cost', 'other_cost' => 'Other cost'] as $key => $label) self::nonNegative($data[$key] ?? null, $label);
        $total = self::round((float) $data['purchase_cost'] + (float) $data['shipping_cost'] + (float) $data['other_cost']);
        return ['total_cost' => $total, 'individual_piece_cost' => self::round($total / (float) $data['quantity'])];
    }

    public static function variant(array $purchase, array $variant): array
    {
        self::positive($variant['quantity'] ?? null, 'Variant quantity');
        self::percentage($variant['profit_percent'] ?? null, 'Profit');
        self::percentage($variant['dealer_discount_percent'] ?? null, 'Dealer discount');
        self::nonNegative($variant['customer_discount_value'] ?? null, 'Customer discount');
        $quantity = (float) $variant['quantity'];
        if (($variant['unit'] ?? '') === 'Piece') {
            if ($purchase['cost_per_piece'] === null) throw new DomainException('Piece variants require a piece-based raw material purchase.');
            $raw = $quantity * (float) $purchase['cost_per_piece'];
        } else {
            if ($purchase['cost_per_gram'] === null) throw new DomainException('Weight variants require a KG or Gram raw material purchase.');
            $raw = self::grams($quantity, (string) $variant['unit']) * (float) $purchase['cost_per_gram'];
        }
        $landing = $raw + (float) $variant['packaging_cost'] + (float) $variant['stickering_cost'] + (float) $variant['labour_cost'];
        $mrp = $landing * (1 + ((float) $variant['profit_percent'] / 100));
        $type = $variant['customer_discount_type'] ?? '';
        if (!in_array($type, ['Percentage', 'Flat'], true)) throw new DomainException('Customer discount type is invalid.');
        if ($type === 'Percentage') self::percentage($variant['customer_discount_value'], 'Customer discount');
        $selling = $type === 'Flat' ? $mrp - (float) $variant['customer_discount_value'] : $mrp * (1 - ((float) $variant['customer_discount_value'] / 100));
        if ($selling < 0) throw new DomainException('Flat customer discount must not be greater than MRP.');
        return ['raw_material_cost' => self::round($raw), 'landing_cost' => self::round($landing), 'mrp' => self::round($mrp), 'selling_price' => self::round($selling), 'dealer_price' => self::round($mrp * (1 - ((float) $variant['dealer_discount_percent'] / 100)))];
    }

    private static function grams(float $quantity, string $unit): float
    {
        return match ($unit) { 'KG' => $quantity * 1000, 'Gram' => $quantity, default => throw new DomainException('Only KG and Gram can be converted.') };
    }
    private static function positive(mixed $value, string $label): void { if (!is_numeric($value) || (float) $value <= 0) throw new DomainException("{$label} must be greater than zero."); }
    private static function nonNegative(mixed $value, string $label): void { if (!is_numeric($value) || (float) $value < 0) throw new DomainException("{$label} must be zero or greater."); }
    private static function percentage(mixed $value, string $label, bool $allowHundred = true): void { if (!is_numeric($value) || !preg_match('/^\\d+(\\.\\d{1,4})?$/', (string) $value) || (float) $value < 0 || (float) $value > ($allowHundred ? 100 : 99.9999)) throw new DomainException("{$label} must be between 0 and " . ($allowHundred ? '100' : 'less than 100') . ' with up to four decimal places.'); }
    private static function round(float $value, int $precision = 4): float { return round($value, $precision); }
}
