import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-heading">Lu Gia Jen</h1>
          </CardTitle>
          <CardDescription>Karate coaching platform</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Ch1 scaffold actief. Inloggen volgt in Ch3.
          </p>
          <Button disabled>Inloggen</Button>
        </CardContent>
      </Card>
    </main>
  );
}
