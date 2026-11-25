import { Button } from "@/components/ui/button";
import { Loader2, Funnel, Search, HelpCircle, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PopoverFilterProps {
    form: any;
    onSubmit: (values: any) => void;
    loading: boolean;
    ContainerFilter: React.FC<{ form: any; onSubmit: (values: any) => void; loading: boolean; [key: string]: any }>; // Allow additional props
    showSearch?: boolean;
    searchInput?: {
        placeholder?: string;
        label?: string;
        className?: string;
        tooltipTitle?: string;
        tooltip?: string;
    };
    filterIcon?: React.ReactNode;
    filterText?: string;
    submitVariant?: any;
    [key: string]: any; // Allow additional props
}

export const PopoverFilter = ({ 
    form, 
    onSubmit, 
    loading, 
    ContainerFilter, 
    showSearch = true, 
    searchInput,
    filterIcon,
    filterText = "Filters",
    submitVariant = "default",
    ...containerFilterProps // Extract additional props for ContainerFilter
}: PopoverFilterProps) => {
    const [openFilter, setOpenFilter] = useState(false);
    const [searchText, setSearchText] = useState(form.getValues().search || "");

    // Initialize search text from form
    useEffect(() => {
        setSearchText(form.getValues().search || "");
    }, [form]);

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value);
    };

    const handleFilterSubmit = (values: any) => {
        onSubmit(values);
        setOpenFilter(false);
    };

    const handleClearSearch = () => {
        setSearchText("");
        form.setValue("search", "");
        onSubmit(form.getValues());
    };

    return (
        <div className="flex flex-col sm:flex-row gap-3 items-end justify-end">
            {showSearch && <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={searchInput?.placeholder ?? "Search..."}
                    id="search"
                    className={cn("pl-10 pr-10 py-2", searchInput?.className)}
                    value={searchText}
                    onChange={handleSearchChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            form.setValue("search", searchText);
                            onSubmit(form.getValues());
                        }
                    }}
                    disabled={loading}
                />
                {searchText ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 h-full rounded-l-none text-muted-foreground hover:text-foreground"
                        onClick={handleClearSearch}
                        disabled={loading}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                ) : searchInput?.tooltip ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HelpCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="py-3 w-[250px] border bg-secondary text-secondary-foreground">
                                <div className="space-y-1">
                                    <p className="font-semibold">
                                        {searchInput?.tooltipTitle}
                                    </p>
                                    <p className="text-xs">{searchInput?.tooltip}</p>
                                    <p className="text-xs text-muted-foreground">Press Enter to submit</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : null}
            </div>}
            <div className="flex gap-2">
                <Popover open={openFilter} onOpenChange={setOpenFilter}>
                    <PopoverTrigger asChild>
                        <Button disabled={loading} className="shadow-sm" variant={submitVariant as any}>
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                filterIcon ?? <Funnel className="mr-2 h-4 w-4" />
                            )}
                            {filterText}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-80 p-0"
                        align="end"
                        sideOffset={8}
                    >
                        <div className="">
                            <ContainerFilter
                                form={form}
                                onSubmit={handleFilterSubmit}
                                loading={loading}
                                {...containerFilterProps} // Pass additional props to ContainerFilter
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};