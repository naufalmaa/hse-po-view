import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";

interface ValidationFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export interface FilterState {
  errorType: string;
  employeeName: string;
  companyName: string;
}

export const ValidationFilters: React.FC<ValidationFiltersProps> = ({
  onFilterChange,
  onClearFilters,
}) => {
  const { t } = useAppTranslation();
  const [filters, setFilters] = useState<FilterState>({
    errorType: 'all',
    employeeName: '',
    companyName: '',
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      errorType: 'all',
      employeeName: '',
      companyName: '',
    };
    setFilters(clearedFilters);
    onClearFilters();
    onFilterChange(clearedFilters);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{t($ => $.smartCardValidation.filters.title)}</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearFilters}
            className="ml-auto"
          >
            {t($ => $.smartCardValidation.filters.clearFilters)}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t($ => $.smartCardValidation.filters.errorType.label)}
            </label>
            <Select 
              value={filters.errorType} 
              onValueChange={(value) => handleFilterChange('errorType', value)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={t($ => $.smartCardValidation.filters.errorType.placeholder)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t($ => $.smartCardValidation.filters.errorType.all)}</SelectItem>
                <SelectItem value="Employee Not Found">{t($ => $.smartCardValidation.filters.errorType.employeeNotFound)}</SelectItem>
                <SelectItem value="Validation Error">{t($ => $.smartCardValidation.filters.errorType.validationError)}</SelectItem>
                <SelectItem value="Insert Error">{t($ => $.smartCardValidation.filters.errorType.insertError)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t($ => $.smartCardValidation.filters.employeeName.label)}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t($ => $.smartCardValidation.filters.employeeName.placeholder)}
                value={filters.employeeName}
                onChange={(e) => handleFilterChange('employeeName', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t($ => $.smartCardValidation.filters.companyName.label)}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t($ => $.smartCardValidation.filters.companyName.placeholder)}
                value={filters.companyName}
                onChange={(e) => handleFilterChange('companyName', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};