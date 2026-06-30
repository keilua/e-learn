import React from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const ResourceList = ({ resources = [] }) => {
  if (!resources || resources.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5" />
          Downloadable Resources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {resources.map((resource, index) => (
            <li key={index} className="flex items-center justify-between p-3 bg-muted rounded-md group hover:bg-muted/80 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">
                  {resource.title || `Resource ${index + 1}`}
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <span className="hidden sm:inline">Download</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ResourceList;