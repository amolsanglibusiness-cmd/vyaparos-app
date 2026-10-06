'use client';

import { useMemo, useRef, useState } from 'react';
import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertTriangle,
    TrendingUp,
    Boxes,
    ImageIcon,
    Wifi,
    WifiOff,
    ArrowLeft,
    Camera,
    Settings,
    ChevronDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { readImageFile } from '@/src/lib/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useSettings } from './settings-context';
import { MobileFab } from './mobile-fab';
import { generateId } from './mock-data';
import { useInventory } from '@/src/context/InventoryContext';
import type { InventoryItem } from './types';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);

type StockLevel = 'good' | 'low' | 'critical' | 'out';

function getStockLevel(item: InventoryItem): StockLevel {
    if (item.stock === 0) return 'out';
    if (item.stock <= item.minStock / 2) return 'critical';
    if (item.stock <= item.minStock) return 'low';
    return 'good';
}

const stockConfig: Record<StockLevel, { labelKey: 'good' | 'low' | 'critical' | 'out'; color: string; bg: string; dot: string }> = {
    good: { labelKey: 'good', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
    low: { labelKey: 'low', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
    critical: { labelKey: 'critical', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
    out: { labelKey: 'out', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-500' },
};

export function InventoryPage() {
    const { t } = useSettings();

    // Offline / Online Status
    const { inventory: items, onlineState: isOnline, addItem, updateItem, deleteItem } = useInventory();

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'good'>('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [mobileItemMode, setMobileItemMode] = useState<'product' | 'services'>('product');
    const [mobileItemTab, setMobileItemTab] = useState<'pricing' | 'stock'>('pricing');
    const [mobileUnitScreen, setMobileUnitScreen] = useState(false);
    const [mobileUnitSearch, setMobileUnitSearch] = useState('');
    const [mobilePrimaryUnit, setMobilePrimaryUnit] = useState('');
    const mobilePhotoInputRef = useRef<HTMLInputElement | null>(null);

    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form state
    const [fName, setFName] = useState('');
    const [fItemCode, setFItemCode] = useState('');
    const [fHsnSac, setFHsnSac] = useState('');
    const [fWholesalePrice, setFWholesalePrice] = useState('');
    const [fDiscount, setFDiscount] = useState('');
    const [fDiscountMode, setFDiscountMode] = useState<'Percentage' | 'Amount'>('Percentage');
    const [fAsOfDate, setFAsOfDate] = useState(new Date().toISOString().slice(0, 10));
    const [fAtPrice, setFAtPrice] = useState('');
    const [fLocation, setFLocation] = useState('');
    const [fCategory, setFCategory] = useState('');
    const [fUnit, setFUnit] = useState('pack');
    const [fPurchasePrice, setFPurchasePrice] = useState('');
    const [fSellingPrice, setFSellingPrice] = useState('');
    const [fTaxRate, setFTaxRate] = useState('0');
    const [fStock, setFStock] = useState('');
    const [fMinStock, setFMinStock] = useState('');
    const [fShowPOS, setFShowPOS] = useState(true);
    const [fPhotoUrl, setFPhotoUrl] = useState('');
    const [photoError, setPhotoError] = useState<string | null>(null);

    const mobileUnits = [
        { group: 'Common', units: ['Piece', 'Pack', 'Box', 'Set', 'Pair', 'Dozen'] },
        { group: 'Weight', units: ['Kilogram (kg)', 'Gram (g)', 'Milligram (mg)', 'Quintal', 'Tonne'] },
        { group: 'Volume', units: ['Litre (L)', 'Millilitre (ml)', 'Gallon'] },
        { group: 'Length', units: ['Meter (m)', 'Centimeter (cm)', 'Millimeter (mm)', 'Foot (ft)', 'Inch (in)'] },
        { group: 'Area', units: ['Square Feet (sq ft)', 'Square Meter (sq m)'] },
        { group: 'Other', units: ['Bottle', 'Bag', 'Carton', 'Bundle', 'Roll', 'Service'] },
    ];
    const filteredMobileUnits = mobileUnits
        .map((group) => ({ ...group, units: group.units.filter((unit) => unit.toLowerCase().includes(mobileUnitSearch.toLowerCase())) }))
        .filter((group) => group.units.length > 0);

    const categories = useMemo(() => {
        const cats = new Set(items.map((i) => i.category));
        return ['all', ...Array.from(cats)];
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
            if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (stockFilter === 'low' && getStockLevel(item) === 'good') return false;
            if (stockFilter === 'good' && getStockLevel(item) !== 'good') return false;
            return true;
        });
    }, [items, categoryFilter, searchQuery, stockFilter]);

    const stats = useMemo(() => {
        const lowCount = items.filter((i) => getStockLevel(i) === 'low').length;
        const outCount = items.filter((i) => i.stock <= 0).length;
        const stockValue = items.reduce((s, i) => s + i.stock * i.purchasePrice, 0);
        return { total: items.length, low: lowCount, out: outCount, value: stockValue };
    }, [items]);

    const resetForm = () => {
        setFName('');
        setFCategory('');
        setFItemCode('');
        setFHsnSac('');
        setFWholesalePrice('');
        setFDiscount('');
        setFDiscountMode('Percentage');
        setFAsOfDate(new Date().toISOString().slice(0, 10));
        setFAtPrice('');
        setFLocation('');
        setFUnit('pack');
        setFPurchasePrice('');
        setFSellingPrice('');
        setFTaxRate('0');
        setFStock('');
        setFMinStock('');
        setFShowPOS(true);
        setFPhotoUrl('');
        setPhotoError(null);
        setEditItem(null);
        setMobileItemMode('product');
        setMobileItemTab('pricing');
        setMobileUnitScreen(false);
        setMobileUnitSearch('');
        setMobilePrimaryUnit('');
    };

    const openAdd = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (item: InventoryItem) => {
        setEditItem(item);
        setFName(item.name);
        setFCategory(item.category);
        setFItemCode('');
        setFHsnSac('');
        setFWholesalePrice('');
        setFDiscount('');
        setFDiscountMode('Percentage');
        setFAsOfDate(new Date().toISOString().slice(0, 10));
        setFAtPrice(String(item.purchasePrice));
        setFLocation('');
        setFUnit(item.unit);
        setFPurchasePrice(String(item.purchasePrice));
        setFSellingPrice(String(item.sellingPrice));
        setFTaxRate(String(item.taxRate ?? 0));
        setFStock(String(item.stock));
        setFMinStock(String(item.minStock));
        setFShowPOS(item.showOnPOS);
        setFPhotoUrl(item.photoUrl ?? '');
        setPhotoError(null);
        setDialogOpen(true);
    };

    const handleSave = () => {
        const isService = mobileItemMode === 'services';
        // Services do not require purchase price or stock. They only need a name and sale/service price.
        if (!fName.trim() || !fSellingPrice || (!isService && !fPurchasePrice)) return;
        const data = {
            name: fName.trim(),
            category: fCategory.trim() || (isService ? 'Services' : 'General'),
            unit: isService ? 'Service' : (fUnit.trim() || 'unit'),
            purchasePrice: isService ? 0 : (parseFloat(fPurchasePrice) || 0),
            sellingPrice: parseFloat(fSellingPrice) || 0,
            taxRate: parseFloat(fTaxRate) || 0,
            stock: isService ? 0 : (parseInt(fStock) || 0),
            minStock: isService ? 0 : (parseInt(fMinStock) || 0),
            showOnPOS: fShowPOS,
            photoUrl: fPhotoUrl || null,
        };

        if (editItem) {
            updateItem({
                ...editItem,
                ...data,
            });
        } else {
            const newItem: InventoryItem = {
                id: generateId('inv'),
                ...data,
                createdAt: new Date().toISOString(),
            };
            addItem(newItem);
        }
        resetForm();
        setDialogOpen(false);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteItem(deleteId);
            setDeleteId(null);
        }
    };

    return (
        <div className="vy-ref-inventory mx-auto max-w-5xl">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 shrink-0 -mx-4 w-[calc(100%+2rem)] border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:mx-0 lg:w-full">
                <div className="flex min-h-10 items-center gap-2">
                    <button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="min-w-0 flex-1 text-base font-bold">Inventory</h1>
                    <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        if (!open) resetForm();
                        setDialogOpen(open);
                    }}
                >
                    <DialogTrigger asChild>
                        <Button onClick={openAdd} className="hidden gap-1.5 lg:inline-flex">
                            <Plus className="h-4 w-4" />
                            {t.addItem}
                        </Button>
                    </DialogTrigger>
                </Dialog>
                </div>
            </header>

            {/* Reference-style summary cards */}
            <div className="vy-ref-summary-grid mb-5">
                <div className="vy-ref-summary-stat blue"><span><Boxes /></span><small>{t.totalItems}</small><b>{stats.total}</b><em>↑ 12%</em></div>
                <div className="vy-ref-summary-stat cyan"><span><TrendingUp /></span><small>{t.totalStockValue}</small><b>{formatCurrency(stats.value)}</b><em>↑ 18%</em></div>
                <div className="vy-ref-summary-stat amber"><span><AlertTriangle /></span><small>{t.lowStockCount}</small><b>{stats.low}</b><em>↓ 50%</em></div>
                <div className="vy-ref-summary-stat purple"><span><Package /></span><small>Out of Stock</small><b>{stats.out}</b><em>↓ 75%</em></div>
            </div>

            {/* Search + Filters */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t.searchItems}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                                {cat === 'all' ? t.allCategories : cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as 'all' | 'low' | 'good')}>
                    <SelectTrigger className="w-full sm:w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t.allParties}</SelectItem>
                        <SelectItem value="low">{t.lowStockCount}</SelectItem>
                        <SelectItem value="good">{t.wellStocked}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table (desktop) / Cards (mobile) */}
            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                    <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">{t.noItems}</p>
                    <p className="text-xs text-muted-foreground/70">{t.noItemsDesc}</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm lg:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">{t.itemPhoto}</TableHead>
                                    <TableHead>{t.itemName}</TableHead>
                                    <TableHead>{t.category}</TableHead>
                                    <TableHead className="text-right">{t.purchasePrice}</TableHead>
                                    <TableHead className="text-right">{t.sellingPrice}</TableHead>
                                    <TableHead className="text-right">{t.profitMargin}</TableHead>
                                    <TableHead className="text-center">{t.currentStock}</TableHead>
                                    <TableHead className="text-center">{t.stockLevel}</TableHead>
                                    <TableHead className="text-center">{t.showOnPOS}</TableHead>
                                    <TableHead className="text-right">{t.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => {
                                    const level = getStockLevel(item);
                                    const config = stockConfig[level];
                                    const margin = item.sellingPrice - item.purchasePrice;
                                    return (
                                        <TableRow key={item.id} className="transition-colors hover:bg-muted/30">
                                            <TableCell>
                                                {item.photoUrl ? (
                                                    <img src={item.photoUrl} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                                        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground">{item.category}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">{formatCurrency(item.purchasePrice)}</TableCell>
                                            <TableCell className="text-right text-sm font-medium">{formatCurrency(item.sellingPrice)}</TableCell>
                                            <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400">
                                                +{formatCurrency(margin)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn('font-bold', config.color)}>
                                                    {item.stock}
                                                </span>
                                                <span className="text-xs text-muted-foreground"> / {item.minStock} {item.unit}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.color)}>
                                                    <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                                                    {t[config.labelKey]}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.showOnPOS ? (
                                                    <Badge variant="default" className="text-xs">{t.showOnPOSYes}</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">{t.showOnPOSNo}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEdit(item)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteId(item.id)}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 lg:hidden">
                        {filteredItems.map((item) => {
                            const level = getStockLevel(item);
                            const config = stockConfig[level];
                            const margin = item.sellingPrice - item.purchasePrice;
                            return (
                                <div
                                    key={item.id}
                                    className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                                >
                                    <div className="relative h-44 w-full overflow-hidden bg-muted">
                                        {item.photoUrl ? (
                                            <img
                                                src={item.photoUrl}
                                                alt={item.name}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        <div className="absolute left-3 top-3">
                                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur', config.bg, config.color)}>
                                                <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                                                {t[config.labelKey]}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-base font-bold">{item.name}</p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">{item.category} • {item.unit}</p>
                                            </div>
                                            {item.showOnPOS && (
                                                <Badge variant="default" className="shrink-0 text-[10px]">POS</Badge>
                                            )}
                                        </div>
                                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">{t.purchasePrice}</p>
                                                    <p className="font-medium">{formatCurrency(item.purchasePrice)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">{t.sellingPrice}</p>
                                                    <p className="font-medium">{formatCurrency(item.sellingPrice)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">{t.profitMargin}</p>
                                                    <p className="font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(margin)}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-xs">
                                                    <span className={cn('font-bold', config.color)}>{item.stock}</span>
                                                    <span className="text-muted-foreground"> / {item.minStock} {item.unit}</span>
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {item.showOnPOS && (
                                                        <Badge variant="default" className="text-[10px]">POS</Badge>
                                                    )}
                                                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 w-7 p-0">
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteId(item.id)}
                                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Add/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    if (!open) resetForm();
                    setDialogOpen(open);
                }}
            >
                <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto mobile-entry-screen add-item-mobile-screen p-0 lg:p-6">
                    {/* Desktop: keep the existing compact form exactly as before */}
                    <div className="hidden lg:block">
                        <DialogHeader>
                            <DialogTitle>{editItem ? t.editItem : t.addItem}</DialogTitle>
                            <DialogDescription>
                                {editItem
                                    ? 'Update item details, pricing, and stock levels.'
                                    : 'Add a new item to your inventory with pricing and stock tracking.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t.itemPhoto}</Label>
                                <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                                    {fPhotoUrl ? <img src={fPhotoUrl} alt="Item preview" className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted"><ImageIcon className="h-7 w-7 text-muted-foreground/50" /></div>}
                                    <div className="min-w-0 flex-1">
                                        <label className="inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                                            <ImageIcon className="mr-2 h-4 w-4" />
                                            {fPhotoUrl ? 'Change Photo' : t.addPhoto}
                                            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; if (!file) return; try { setPhotoError(null); setFPhotoUrl(await readImageFile(file)); } catch (error) { setPhotoError(error instanceof Error ? error.message : 'Unable to upload photo.'); } }} />
                                        </label>
                                        {fPhotoUrl && <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => setFPhotoUrl('')}>Remove</Button>}
                                        <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, WEBP • Maximum 2MB</p>
                                        {photoError && <p className="mt-1 text-xs text-destructive">{photoError}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label>{t.itemName}</Label><Input placeholder="Item name" value={fName} onChange={(e) => setFName(e.target.value)} autoFocus /></div>
                                <div className="space-y-1.5"><Label>{t.category}</Label><Input placeholder="Category" value={fCategory} onChange={(e) => setFCategory(e.target.value)} /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5"><Label>{t.unit}</Label><Input placeholder="pack" value={fUnit} onChange={(e) => setFUnit(e.target.value)} /></div>
                                <div className="space-y-1.5"><Label>{t.purchasePrice} (₹)</Label><Input type="number" placeholder="0" value={fPurchasePrice} onChange={(e) => setFPurchasePrice(e.target.value)} min="0" /></div>
                                <div className="space-y-1.5"><Label>{t.sellingPrice} (₹)</Label><Input type="number" placeholder="0" value={fSellingPrice} onChange={(e) => setFSellingPrice(e.target.value)} min="0" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5"><Label>GST / Tax %</Label><Input type="number" placeholder="0" value={fTaxRate} onChange={(e) => setFTaxRate(e.target.value)} min="0" step="0.01" /></div>
                                <div className="space-y-1.5"><Label>{t.currentStock}</Label><Input type="number" placeholder="0" value={fStock} onChange={(e) => setFStock(e.target.value)} min="0" /></div>
                                <div className="space-y-1.5"><Label>{t.minStock}</Label><Input type="number" placeholder="0" value={fMinStock} onChange={(e) => setFMinStock(e.target.value)} min="0" /></div>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-border/40 p-3"><div><p className="text-sm font-medium">{t.showOnPOS}</p><p className="text-xs text-muted-foreground">{t.showOnPOS}</p></div><Switch checked={fShowPOS} onCheckedChange={setFShowPOS} /></div>
                            {fPurchasePrice && fSellingPrice && <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm"><TrendingUp className="h-4 w-4 text-emerald-600" /><span className="text-muted-foreground">{t.profitMargin}:</span><span className="font-bold text-emerald-600">{formatCurrency((parseFloat(fSellingPrice) || 0) - (parseFloat(fPurchasePrice) || 0))}</span></div>}
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>{t.cancel}</Button><Button onClick={handleSave}>{t.save}</Button></DialogFooter>
                    </div>

                    {/* Mobile: full-screen invoice-style Add Item */}
                    <div className="flex min-h-[100dvh] flex-col lg:hidden">
                        {!mobileUnitScreen ? (
                            <>
                                <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-sky-200/70 bg-background px-5 dark:border-sky-900/70">
                                    <button type="button" className="mr-5 rounded-full p-1 text-blue-600 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40" onClick={() => { resetForm(); setDialogOpen(false); }} aria-label="Back"><ArrowLeft className="h-6 w-6" /></button>
                                    <h2 className="flex-1 text-[22px] font-medium">{editItem ? 'Edit Item' : 'Add Item'}</h2>
                                    <label className="mr-4 cursor-pointer text-blue-600 dark:text-sky-300">
                                        <Camera className="h-6 w-6" />
                                        <input ref={mobilePhotoInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; if (!file) return; try { setPhotoError(null); setFPhotoUrl(await readImageFile(file)); } catch (error) { setPhotoError(error instanceof Error ? error.message : 'Unable to upload photo.'); } }} />
                                    </label>
                                    <Settings className="h-6 w-6 text-muted-foreground" />
                                </div>

                                {/* Product / Services */}
                                <div className="border-b-[7px] border-sky-100 bg-gradient-to-r from-sky-50/70 via-background to-violet-50/60 px-5 py-4 dark:border-sky-950 dark:from-sky-950/20 dark:via-background dark:to-violet-950/20">
                                    <div className="mx-auto flex max-w-sm items-center justify-center gap-8 text-[18px]">
                                        <button type="button" onClick={() => { setMobileItemMode('product'); if (fUnit === 'Service') setFUnit('pack'); }} className={cn('font-medium', mobileItemMode === 'product' ? 'text-foreground' : 'text-muted-foreground')}>Product</button>
                                        <button type="button" role="switch" aria-checked={mobileItemMode === 'services'} onClick={() => { const next = mobileItemMode === 'product' ? 'services' : 'product'; setMobileItemMode(next); setMobileItemTab('pricing'); if (next === 'services') setFUnit('Service'); else if (fUnit === 'Service') setFUnit('pack'); }} className="relative h-8 w-12 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 p-1">
                                            <span className={cn('block h-6 w-6 rounded-full bg-white transition-transform', mobileItemMode === 'services' ? 'translate-x-4' : 'translate-x-0')} />
                                        </button>
                                        <button type="button" onClick={() => { setMobileItemMode('services'); setMobileItemTab('pricing'); setFUnit('Service'); }} className={cn('font-medium', mobileItemMode === 'services' ? 'text-foreground' : 'text-muted-foreground')}>Services</button>
                                    </div>
                                </div>

                                {/* Basic item information */}
                                <div className="space-y-5 px-5 py-4">
                                    <div className="relative">
                                        <label className="absolute -top-2 left-3 z-10 bg-background px-1 text-[15px] font-medium text-primary">Item Name <span className="text-red-600">*</span></label>
                                        <Input value={fName} onChange={(e) => setFName(e.target.value)} autoFocus className="h-[58px] rounded-lg border-2 border-primary px-3 text-[16px] pr-32" placeholder="Item Name" />
                                        <button type="button" onClick={() => { setMobileUnitSearch(''); setMobilePrimaryUnit(fUnit || ''); setMobileUnitScreen(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-sky-200 bg-gradient-to-r from-sky-100 via-blue-100 to-violet-100 px-3 py-1.5 text-[13px] font-semibold text-blue-700 dark:border-sky-800 dark:from-sky-950/60 dark:via-blue-950/60 dark:to-violet-950/60 dark:text-sky-200">{fUnit || 'Select Unit'}</button>
                                    </div>
                                    <div className="relative"><Input value={fItemCode} onChange={(e) => setFItemCode(e.target.value)} placeholder="Item Code / Barcode" className="h-[54px] rounded-lg text-[15px]" /><button type="button" onClick={() => setFItemCode(`ITEM-${Date.now().toString().slice(-6)}`)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-sky-200 bg-gradient-to-r from-sky-100 via-blue-100 to-violet-100 px-4 py-2 text-[15px] font-semibold text-blue-700 dark:border-sky-800 dark:from-sky-950/60 dark:via-blue-950/60 dark:to-violet-950/60 dark:text-sky-200">Assign Code</button></div>
                                    <div className="relative"><Input value={fCategory} onChange={(e) => setFCategory(e.target.value)} placeholder="Item Category" className="h-[54px] rounded-lg text-[15px] pr-12" /><ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /></div>
                                    <div className="relative"><Input value={fHsnSac} onChange={(e) => setFHsnSac(e.target.value)} placeholder="HSN/SAC Code" className="h-[54px] rounded-lg text-[15px] pr-12" /><Search className="pointer-events-none absolute right-5 top-1/2 h-6 w-6 -translate-y-1/2 text-primary" /></div>
                                </div>

                                {/* Pricing / Stock tabs for Products */}
                                {mobileItemMode === 'product' && <div className="border-y-[7px] border-sky-100 bg-background">
                                    <div className="grid grid-cols-2 border-b">
                                        <button type="button" onClick={() => setMobileItemTab('pricing')} className={cn('h-16 text-[18px]', mobileItemTab === 'pricing' ? 'border-b-[3px] border-rose-500 text-rose-600' : 'text-muted-foreground')}>Pricing</button>
                                        <button type="button" onClick={() => setMobileItemTab('stock')} className={cn('h-16 text-[18px]', mobileItemTab === 'stock' ? 'border-b-[3px] border-rose-500 text-rose-600' : 'text-muted-foreground')}>Stock</button>
                                    </div>
                                    {mobileItemTab === 'pricing' ? <div className="space-y-3 px-5 py-4">
                                        <h3 className="border-b pb-2 text-[16px] font-semibold">Sale Price</h3>
                                        <div className="relative"><Input type="number" value={fSellingPrice} onChange={(e) => setFSellingPrice(e.target.value)} placeholder="Sale Price" className="h-14 rounded-lg pr-32 text-[15px]" /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted px-3 py-1.5 text-[12px] text-muted-foreground">Without Tax <ChevronDown className="ml-1 inline h-4 w-4" /></button></div>
                                        <div className="relative"><Input type="number" value={fDiscount} onChange={(e) => setFDiscount(e.target.value)} placeholder="Disc. On Sale Price" className="h-16 rounded-lg pr-32 text-[18px]" /><button type="button" onClick={() => setFDiscountMode(fDiscountMode === 'Percentage' ? 'Amount' : 'Percentage')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted px-3 py-1.5 text-[12px] text-muted-foreground">{fDiscountMode} <ChevronDown className="ml-1 inline h-4 w-4" /></button></div>
                                        <button type="button" onClick={() => setFWholesalePrice(fWholesalePrice || fSellingPrice)} className="text-[17px] font-semibold text-primary">＋ Add Wholesale Price <span className="text-purple-500">●</span></button>
                                        {fWholesalePrice && <Input type="number" value={fWholesalePrice} onChange={(e) => setFWholesalePrice(e.target.value)} placeholder="Wholesale Price" className="h-12 border-sky-200 bg-background text-[15px] dark:border-sky-900" />}
                                        <h3 className="border-b border-sky-100 pb-2 pt-1 text-[16px] font-semibold">Purchase Price</h3>
                                        <Input type="number" value={fPurchasePrice} onChange={(e) => setFPurchasePrice(e.target.value)} placeholder="Purchase Price" className="h-14 rounded-lg text-[15px]" />
                                        <h3 className="border-b border-sky-100 pb-2 pt-1 text-[16px] font-semibold">Taxes</h3>
                                        <div className="relative"><Input value={fTaxRate === '0' ? '' : fTaxRate} onChange={(e) => setFTaxRate(e.target.value || '0')} placeholder="Tax Rate  •  None" className="h-14 rounded-lg text-[15px] pr-12" /><ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2" /></div>
                                    </div> : <div className="space-y-6 px-5 py-4">
                                        <div className="relative"><label className="absolute -top-2 left-3 bg-background px-1 text-[15px] text-muted-foreground">Opening Stock</label><Input type="number" value={fStock} onChange={(e) => setFStock(e.target.value)} placeholder="Ex: 300" className="h-14 text-[15px]" /></div>
                                        <div className="grid grid-cols-2 gap-2"><div className="relative"><label className="absolute -top-2 left-3 bg-background px-1 text-[15px] text-muted-foreground">As of Date</label><Input type="date" value={fAsOfDate} onChange={(e) => setFAsOfDate(e.target.value)} className="h-14 text-[14px]" /></div><div className="relative"><label className="absolute -top-2 left-3 bg-background px-1 text-[15px] text-muted-foreground">At Price/Unit</label><Input type="number" value={fAtPrice} onChange={(e) => setFAtPrice(e.target.value)} placeholder="Ex: 2,000" className="h-14 text-[14px]" /></div></div>
                                        <div className="grid grid-cols-2 gap-2"><div className="relative"><label className="absolute -top-2 left-3 bg-background px-1 text-[15px] text-muted-foreground">Min Stock Qty</label><Input type="number" value={fMinStock} onChange={(e) => setFMinStock(e.target.value)} placeholder="Ex: 5" className="h-14 text-[14px]" /></div><Input value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="Item Location" className="h-14 text-[14px]" /></div>
                                    </div>}
                                </div>}

                                {/* Services pricing screen */}
                                {mobileItemMode === 'services' && <div className="border-t-[7px] border-sky-100 bg-background px-5 py-4">
                                    <h3 className="border-b pb-2 text-[16px] font-semibold">Service Price</h3>
                                    <div className="mt-3 space-y-3">
                                        <div className="relative"><Input type="number" value={fSellingPrice} onChange={(e) => setFSellingPrice(e.target.value)} placeholder="Service Price" className="h-14 rounded-lg pr-32 text-[15px]" /><span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-muted px-4 py-2 text-[15px] text-muted-foreground">Without Tax</span></div>
                                        <div className="relative"><Input type="number" value={fTaxRate === '0' ? '' : fTaxRate} onChange={(e) => setFTaxRate(e.target.value || '0')} placeholder="Tax Rate" className="h-14 rounded-lg text-[15px]" /></div>
                                        <div className="rounded-lg bg-sky-50 px-3 py-3 text-[13px] text-primary">Services do not track opening stock or stock location.</div>
                                    </div>
                                </div>}

                                <div className="h-28" />
                                <div className="mobile-entry-footer">
                                    <Button variant="outline" className="mobile-entry-action shadow-none" onClick={() => { resetForm(); setDialogOpen(false); }}>{t.cancel}</Button>
                                    <Button className="mobile-entry-save mobile-entry-action shadow-none" onClick={handleSave}>{t.save}</Button>
                                </div>
                            </>
                        ) : (
                            /* Full-screen Add Item Unit */
                            <div className="flex min-h-[100dvh] flex-col bg-background">
                                <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-sky-300/50 bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 px-5 text-white">
                                    <button type="button" className="mr-5 rounded-full p-1 text-white hover:bg-white/15" onClick={() => setMobileUnitScreen(false)} aria-label="Back"><ArrowLeft className="h-6 w-6" /></button>
                                    <h2 className="text-[21px] font-medium">Add Item Unit</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-28">
                                    <div className="mb-5 relative"><Input value={mobilePrimaryUnit} onChange={(e) => setMobilePrimaryUnit(e.target.value)} placeholder="Primary Unit" className="h-16 rounded-lg border-2 border-sky-300 bg-sky-50/40 text-[20px] text-slate-800 dark:border-sky-800 dark:bg-sky-950/20 dark:text-slate-100" /><ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2" /></div>
                                    <div className="mb-7 relative"><Input placeholder="Secondary Unit" className="h-16 rounded-lg border-sky-200 bg-violet-50/30 text-[20px] dark:border-violet-900 dark:bg-violet-950/15" /><ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2" /></div>
                                    <div className="mb-5"><Input value={mobileUnitSearch} onChange={(e) => setMobileUnitSearch(e.target.value)} placeholder="Search units" className="h-12 border-sky-200 bg-background text-[15px] dark:border-sky-900" /></div>
                                    <div className="space-y-6">
                                        {filteredMobileUnits.map((group) => <div key={group.group}><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.group}</h3><div className="grid grid-cols-2 gap-2">{group.units.map((unit) => <button key={unit} type="button" onClick={() => setMobilePrimaryUnit(unit)} className={cn('rounded-lg border px-3 py-3 text-left text-[16px]', mobilePrimaryUnit === unit ? 'border-blue-500 bg-gradient-to-r from-sky-50 via-blue-50 to-violet-50 text-blue-700 dark:border-violet-500 dark:from-sky-950/40 dark:via-blue-950/40 dark:to-violet-950/40 dark:text-sky-200' : 'border-border bg-background hover:border-sky-300 dark:hover:border-sky-700')}>{unit}</button>)}</div></div>)}
                                    </div>
                                </div>
                                <div className="mobile-entry-footer"><Button variant="outline" className="mobile-entry-action shadow-none" onClick={() => setMobileUnitScreen(false)}>Cancel</Button><Button className="mobile-entry-save mobile-entry-action shadow-none" onClick={() => { if (mobilePrimaryUnit) setFUnit(mobilePrimaryUnit); setMobileUnitScreen(false); }}>Save</Button></div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                        <AlertDialogDescription>{t.confirmDeleteDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <MobileFab label={t.addItem} onClick={openAdd} />
        </div>
    );
}