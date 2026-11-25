import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { Fragment } from 'react';
import { AppRoute } from "@/constants/app-route";
import HseLogo from "@/assets/app/hse.png"

export function Breadcrumbs() {
  const items = useBreadcrumbs(AppRoute);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-row gap-x-4 w-full items-center">
      {/* <div className='dark:bg-neutral-300 px-1 py-0.5'><img src={HseLogo} alt={"HSE"} style={{height: 24, width: 95, flexShrink: 0}}/></div> */}
      <Breadcrumb className="min-w-0 flex-1 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px] xl:max-w-[600px] 2xl:max-w-[800px]">
        <BreadcrumbList className="flex-nowrap whitespace-nowrap">
          {items.map((item: Record<string, any>, index: number) => (
            <Fragment key={item.title}>
              {index !== items.length - 1 && (
                <BreadcrumbItem className='hidden md:block whitespace-nowrap'>
                  <BreadcrumbLink href={item.link} className="truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">
                    {item.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
              {index < items.length - 1 && (
                <BreadcrumbSeparator className='hidden md:block'>
                  {/* <TbSlash/> */}
                </BreadcrumbSeparator>
              )}
              {index === items.length - 1 && (
                <BreadcrumbPage className="truncate whitespace-nowrap max-w-[150px] sm:max-w-[200px] md:max-w-[300px]">
                  {item.title}
                </BreadcrumbPage>
              )}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}