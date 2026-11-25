import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { Upload, FileText, Users } from 'lucide-react';
import {AppRoute} from "@/constants/app-route";
import { useAppTranslation } from "@/lib/i18n-typed";

export const ValidationRelatedTools: React.FC = () => {
    const { t } = useAppTranslation();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-semibold">{t($ => $.smartCardValidation.relatedTools.title)}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link to={AppRoute.employee.smartCardUpload.url}>
                        <Button variant="outline" className="w-full h-24 p-4 flex flex-col items-center justify-center space-y-2 whitespace-normal">
                            <Upload className="h-6 w-6 text-primary" />
                            <div className="text-center">
                                <div className="font-medium break-words">{t($ => $.smartCardValidation.relatedTools.uploadData)}</div>
                                <div className="text-xs text-muted-foreground break-words">{t($ => $.smartCardValidation.relatedTools.uploadDataDesc)}</div>
                            </div>
                        </Button>
                    </Link>

                    <Link to={AppRoute.employee.smartCard.url}>
                        <Button variant="outline" className="w-full h-24 p-4 flex flex-col items-center justify-center space-y-2 whitespace-normal">
                            <FileText className="h-6 w-6 text-blue-600" />
                            <div className="text-center">
                                <div className="font-medium break-words">{t($ => $.smartCardValidation.relatedTools.viewObservations)}</div>
                                <div className="text-xs text-muted-foreground break-words">{t($ => $.smartCardValidation.relatedTools.viewObservationsDesc)}</div>
                            </div>
                        </Button>
                    </Link>

                    <Link to={AppRoute.employee.list.url}>
                        <Button variant="outline" className="w-full h-24 p-4 flex flex-col items-center justify-center space-y-2 whitespace-normal">
                            <Users className="h-6 w-6 text-green-600" />
                            <div className="text-center">
                                <div className="font-medium break-words">{t($ => $.smartCardValidation.relatedTools.employeeManagement)}</div>
                                <div className="text-xs text-muted-foreground break-words">{t($ => $.smartCardValidation.relatedTools.employeeManagementDesc)}</div>
                            </div>
                        </Button>
                    </Link>

                    <Link to={AppRoute.employee.dashboard.url}>
                        <Button variant="outline" className="w-full h-24 p-4 flex flex-col items-center justify-center space-y-2 whitespace-normal">
                            <Users className="h-6 w-6 text-green-600" />
                            <div className="text-center">
                                <div className="font-medium break-words">{t($ => $.smartCardValidation.relatedTools.employeeDashboard)}</div>
                                <div className="text-xs text-muted-foreground break-words">{t($ => $.smartCardValidation.relatedTools.employeeDashboardDesc)}</div>
                            </div>
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};