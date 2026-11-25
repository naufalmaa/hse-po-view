import React, { useMemo, useEffect, useRef } from 'react';
import GanttChart, { Task, TaskGroup, ViewMode } from 'react-modern-gantt';
import { TimelineContract } from '@/service/csms/csms-dashboard';
import { useAppTranslation } from "@/lib/i18n-typed";
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '@/lib/theme-provider';
import "@/assets/react-modern-gantt.css"
import { AppRoute } from '@/constants/app-route';

interface GanttChartProps {
    contracts: TimelineContract[];
}

// Function to get status color based on contract status
const getStatusColor = (status: string): string => {
    // Define color mapping for different statuses
    const statusColors: Record<string, string> = {
        'finished': '#10B981',      // green
        'on going': '#3B82F6',   // blue
        'not started': '#6B7280',   // gray
        'default': '#9CA3AF'
    };

    return statusColors[status.toLowerCase()] || statusColors['default'];
};

// Function to calculate progress percentage based on assessments
const calculateProgressPercentage = (contract: TimelineContract): number => {
    // If contract is marked as finished, return 100%
    if (contract.status === 'finished') {
        return 100;
    }

    // If contract hasn't started, return 0%
    if (contract.status === 'not started') {
        return 0;
    }

    let totalAssessments = 0;
    let completedAssessments = 0;

    // Count ongoing assessments
    if (contract.onGoingAssessmentDates && contract.onGoingAssessmentDates.length > 0) {
        totalAssessments += contract.onGoingAssessmentDates.length;
        contract.onGoingAssessmentDates.forEach(assessment => {
            if (assessment.isComplete) {
                completedAssessments++;
            }
        });
    }

    // Count final assessment
    if (contract.finalAssessmentDate) {
        totalAssessments += 1;
        if (contract.finalAssessmentDate.isComplete) {
            completedAssessments++;
        }
    }

    // Calculate percentage, avoid division by zero
    if (totalAssessments === 0) {
        return contract.status === 'on going' ? 50 : 0;
    }

    return Math.round((completedAssessments / totalAssessments) * 100);
};

const GanttChartComponent: React.FC<GanttChartProps> = ({ contracts }) => {
    const { t } = useAppTranslation();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const ganttContainerRef = useRef<HTMLDivElement>(null);
    const contractIdsRef = useRef<string[]>([]);

    // Handle click on task group (contract)
    const handleTaskGroupClick = (contractId: string) => {
        // Create the URL for contract management with search parameter
        const contractManagementUrl = `${AppRoute.csms.contractManagementDetails.url}?contractId=${contractId}`;
        navigate({ to: contractManagementUrl });
    };

    // Update contract IDs ref when contracts change
    useEffect(() => {
        contractIdsRef.current = contracts.map(contract => contract.id);
    }, [contracts]);

    // Add click event listeners to task groups using event delegation
    useEffect(() => {
        if (!contracts || contracts.length === 0 || !ganttContainerRef.current) return;

        const container = ganttContainerRef.current;

        // Event delegation handler
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Find the closest task group element
            const taskGroupElement = target.closest('.rmg-task-group');

            if (taskGroupElement) {
                // Get the index from the task group element
                const taskGroups = container.querySelectorAll('.rmg-task-group');
                const index = Array.from(taskGroups).indexOf(taskGroupElement);

                if (index >= 0 && index < contractIdsRef.current.length) {
                    const contractId = contractIdsRef.current[index];
                    handleTaskGroupClick(contractId);
                }
            }
        };

        // Add event listener to the container
        container.addEventListener('click', handleClick);

        // Cleanup
        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [contracts]);

    const taskGroups: TaskGroup[] = useMemo(() => {
        if (!contracts || contracts.length === 0) {
            return [];
        }

        // Create a separate group for each contract
        const groups: TaskGroup[] = contracts.map((contract) => {
            // Use status-based color instead of index-based color
            const color = getStatusColor(contract.status);

            // Calculate progress percentage based on assessments
            const progressPercentage = calculateProgressPercentage(contract);

            const task: Task = {
                id: contract.id,
                name: contract.name,
                startDate: new Date(contract.startDate),
                endDate: new Date(contract.endDate),
                color: color,
                percent: progressPercentage,
            };

            // Format dates for description
            const startDate = new Date(contract.startDate).toLocaleDateString();
            const endDate = new Date(contract.endDate).toLocaleDateString();
            const description = `${startDate} - ${endDate}`;

            return {
                id: `contract-group-${contract.id}`,
                name: contract.name,
                description: description,
                tasks: [task],
            };
        });

        return groups;
    }, [contracts, t]);

    if (!contracts || contracts.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">{t($ => $.csms.dashboard.noContracts)}</p>
            </div>
        );
    }

    // Define status colors for legend (excluding 'default')
    const statusLegend = [
        { name: 'finished', color: '#10B981' },
        { name: 'on going', color: '#3B82F6' },
        { name: 'not started', color: '#6B7280' }
    ];

    return (
        <div className="flex flex-col gap-4 w-full">
            <style>
                {`
                .gantt-chart-container .rmg-gantt-chart {
                    border: 1 !important;
                    box-shadow: none !important;
                }
                .rmg-task-group {
                    cursor: pointer !important;
                }
                `}
            </style>
            <div className="flex justify-center mb-2">
                <div className="flex flex-wrap gap-4">
                    {statusLegend.map((item) => (
                        <div key={item.name} className="flex items-center">
                            <div
                                className="w-4 h-4 mr-2 rounded-sm"
                                style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm capitalize">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="gantt-chart-container" ref={ganttContainerRef}>
                <GanttChart
                    tasks={taskGroups}
                    title={""}
                    headerLabel={t($ => $.csms.dashboard.contract)}
                    darkMode={theme === 'dark'}
                    showProgress={true}
                    viewMode={ViewMode.YEAR}
                    viewModes={[ViewMode.DAY, ViewMode.WEEK, ViewMode.MONTH, ViewMode.QUARTER, ViewMode.YEAR]}
                    editMode={false}
                    allowProgressEdit={false}
                    allowTaskResize={false}
                    allowTaskMove={false}
                />
            </div>
        </div>
    );
};

export default GanttChartComponent;