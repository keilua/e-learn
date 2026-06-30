import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SlidersHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SearchFilters = ({ filters, onFilterChange }) => {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-4">
          <DropdownMenuLabel>Search Configuration</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={filters.type} 
                onValueChange={(val) => handleChange('type', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="course">Courses</SelectItem>
                  <SelectItem value="user">People</SelectItem>
                  <SelectItem value="forum">Discussions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Level (Courses)</Label>
              <RadioGroup 
                value={filters.level} 
                onValueChange={(val) => handleChange('level', val)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="r-all" />
                  <Label htmlFor="r-all" className="font-normal">Any Level</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beginner" id="r-beg" />
                  <Label htmlFor="r-beg" className="font-normal">Beginner</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intermediate" id="r-int" />
                  <Label htmlFor="r-int" className="font-normal">Intermediate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="advanced" id="r-adv" />
                  <Label htmlFor="r-adv" className="font-normal">Advanced</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Category placeholder - as requested in prompt, but limited by schema */}
            <div className="space-y-2">
                <Label>Category</Label>
                <Select disabled>
                    <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="art">Art & Design</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Category filtering coming soon.</p>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden sm:flex items-center gap-2">
        {filters.type !== 'all' && (
          <Button variant="secondary" size="sm" onClick={() => handleChange('type', 'all')} className="h-7 text-xs">
            Type: {filters.type} ×
          </Button>
        )}
        {filters.level !== 'all' && (
          <Button variant="secondary" size="sm" onClick={() => handleChange('level', 'all')} className="h-7 text-xs">
            Level: {filters.level} ×
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;