import { MdOutlineDashboard, MdOutlineWorkHistory } from "react-icons/md";
import { TbFileReport } from "react-icons/tb";
import { HiOutlineUsers } from "react-icons/hi2";
import { LuTable2, LuNetwork, LuSailboat, LuBuilding, LuUserCheck, LuSparkles } from "react-icons/lu";
import { AppRoute } from "@/constants/app-route";
import { GoFileDirectory } from "react-icons/go";
import { AiOutlineDashboard } from "react-icons/ai";
import { RiGuideLine } from "react-icons/ri";
import { GrScorecard } from "react-icons/gr";
import { PiUsersThree } from "react-icons/pi";
import { BsGrid, BsPerson, BsCreditCard } from "react-icons/bs";
import { IoIosNotificationsOutline } from "react-icons/io";
import { TbContract } from "react-icons/tb";

export const AdminNav = {
  user: {},
  teams: {},
  navGroups: [
    {
      title: "MONITOR",
      items: [
        {
          title: "HSE Performance",
          url: AppRoute.dashboard.hsePerformance.url,
          icon: MdOutlineDashboard,
        },
        {
          title: "Reporting",
          icon: TbFileReport,
          items: [
            {
              title: "Daily Report Form",
              url: AppRoute.report.dailyReport.list.url,
              icon: LuTable2,
            },
            {
              title: "Daily Activity Report",
              url: AppRoute.report.dailyActivity.summary.url,
              icon: MdOutlineWorkHistory,
            },
          ]
        },
        {
          title: "CSMS",
          icon: GoFileDirectory,
          items: [
            {
              title: "Dashboard",
              url: AppRoute.csms.dashboard.url,
              icon: AiOutlineDashboard,
            },
            {
              title: "Guidelines",
              url: AppRoute.csms.guidelines.url,
              icon: RiGuideLine,
            },
            // {
            //   title: "Risk Assessment",
            //   url: AppRoute.csms.riskAssessment.url,
            //   icon: BsBracesAsterisk,
            // },
            {
              title: "Sertifikat",
              url: AppRoute.csms.qualification.url,
              icon: GrScorecard,
            },
            {
              title: "Contract Management",
              url: AppRoute.csms.contractManagement.url,
              icon: TbContract,
            }
          ]
        },
        {
          title: "Pekerja",
          icon: PiUsersThree,
          items: [
            {
              title: "Dashboard",
              url: AppRoute.employee.dashboard.url,
              icon: BsGrid
            },
            {
              title: "Data Pekerja",
              url: AppRoute.employee.list.url,
              icon: BsPerson
            },
            {
              title: "KARTU PINTAR",
              url: AppRoute.employee.smartCard.url,
              icon: BsCreditCard
            },
            {
              title: "Absensi Pekerja",
              url: AppRoute.employee.employeeAttendance.url,
              icon: LuUserCheck
            },
          ]
        },
        {
          title: "Notifications",
          icon: IoIosNotificationsOutline,
          items: [
            {
              title: "Table Notification",
              url: AppRoute.notification.list.url,
              icon: IoIosNotificationsOutline
            },
          ]
        },
      ],
      permitUser: true,
    },
    {
      title: "DATA MANAGEMENT",
      items: [
        // {
        //   title: "Vessels",
        //   url: AppRoute.dataManagement.vessel.list.url,
        //   icon: HiOutlineDocumentChartBar
        // },
        {
          title: "Project Name",
          url: AppRoute.dataManagement.subTypes.list.url,
          icon: LuNetwork
        },
        {
          title: "Contractors",
          url: AppRoute.dataManagement.contractor.list.url,
          icon: LuBuilding
        },
        {
          title: "Contractor Vessel",
          url: AppRoute.dataManagement.contractorVessel.list.url,
          icon: LuSailboat
        }
      ],
      permitUser: true,
      permitContractor: false
    },
    {
      title: "ADMIN",
      items: [
        {
          title: "Users",
          url: AppRoute.admin.user.list.url,
          icon: HiOutlineUsers,
        },
        {
          title: "AI CSMS",
          url: AppRoute.admin.csmsAi.url,
          icon: LuSparkles,
        },
      ],
      permitUser: false,
      permitContractor: false
    }
  ]
}

export const ContractorNav = {
  user: {},
  teams: {},
  navGroups: [
    {
      title: "MONITOR",
      items: [
        {
          title: "Reporting",
          icon: TbFileReport,
          items: [
            {
              title: "Daily Report Form",
              url: AppRoute.report.dailyReport.list.url,
              icon: LuTable2,
            },
            {
              title: "Daily Activity Report",
              url: AppRoute.report.dailyActivity.summary.url,
              icon: MdOutlineWorkHistory,
            },
          ]
        },
        {
          title: "CSMS",
          icon: GoFileDirectory,
          items: [
            {
              title: "Dashboard",
              url: AppRoute.csms.dashboard.url,
              icon: AiOutlineDashboard,
            },
            {
              title: "Guidelines",
              url: AppRoute.csms.guidelines.url,
              icon: RiGuideLine,
            },
            // {
            //   title: "Risk Assessment",
            //   url: AppRoute.csms.riskAssessment.url,
            //   icon: BsBracesAsterisk,
            // },
            {
              title: "Sertifikat",
              url: AppRoute.csms.qualification.url,
              icon: GrScorecard,
            },
            {
              title: "Contract Management",
              url: AppRoute.csms.contractManagement.url,
              icon: TbContract,
            }
          ]
        },
        {
          title: "Pekerja",
          icon: PiUsersThree,
          items: [
            {
              title: "Dashboard",
              url: AppRoute.employee.dashboard.url,
              icon: BsGrid
            },
            {
              title: "Data Pekerja",
              url: AppRoute.employee.list.url,
              icon: BsPerson
            },
            {
              title: "KARTU PINTAR",
              url: AppRoute.employee.smartCard.url,
              icon: BsCreditCard
            },
          ]
        },
        {
          title: "Notifications",
          icon: IoIosNotificationsOutline,
          items: [
            {
              title: "Table Notification",
              url: AppRoute.notification.list.url,
              icon: IoIosNotificationsOutline
            },
          ]
        },
      ]
    },
  ]
}

export const CrewNav = {
  user: {},
  teams: {},
  navGroups: [
    {
      title: "MONITOR",
      items: [
        {
          title: "Reporting",
          icon: TbFileReport,
          items: [
            {
              title: "Daily Report Form",
              url: AppRoute.report.dailyReport.list.url,
              icon: LuTable2,
            },
          ]
        },
        {
          title: "Pekerja",
          icon: PiUsersThree,
          items: [
            {
              title: "Data Pekerja",
              url: AppRoute.employee.list.url,
              icon: BsPerson
            }
          ]
        },
        {
          title: "Notifications",
          icon: IoIosNotificationsOutline,
          items: [
            {
              title: "Table Notification",
              url: AppRoute.notification.list.url,
              icon: IoIosNotificationsOutline
            },
          ]
        },
      ]
    },
  ]
}

export const UserNav = {
  ...AdminNav,
  navGroups: AdminNav.navGroups.filter(group => group.permitUser)
}