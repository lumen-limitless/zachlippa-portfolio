"use client";

/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import { getCalApi } from "@calcom/embed-react";
import { Calendar } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./ui/button";

export default function MyApp() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({
        namespace: "quick-chat",
        embedLibUrl: "https://cal.lumenlimitless.com/embed/embed.js",
      });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);
  return (
    <Button
      data-cal-config='{"layout":"month_view"}'
      data-cal-link="zach/quick-chat"
      data-cal-namespace="quick-chat"
      data-cal-origin="https://cal.lumenlimitless.com"
      size={"lg"}
      variant="outline"
    >
      <Calendar className="mr-2 h-4 w-4" />
      Schedule Time
    </Button>
  );
}
