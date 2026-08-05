/** طير السعد (Tair Al Saad) shared UI — import from `@/components` for primitives, layout, and domain building blocks. */

export * from "./layout";
export * from "./shared";

export { Avatar, type AvatarProps } from "./ui/avatar";
export { Badge, badgeVariants, type BadgeProps } from "./ui/badge";
export { Button, buttonVariants, type ButtonProps } from "./ui/button";
export { Calendar, type CalendarProps } from "./ui/calendar";
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
export { Checkbox } from "./ui/checkbox";
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
export { Field, type FieldProps } from "./ui/field";
export { FileUpload, type FileUploadProps } from "./ui/file-upload";
export { Input } from "./ui/input";
export { Label } from "./ui/label";
export { NativeSelect } from "./ui/native-select";
export { Pagination, type PaginationProps } from "./ui/pagination";
export { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
export { Progress } from "./ui/progress";
export { RadioGroup, RadioGroupItem } from "./ui/radio-group";
export { ScrollArea } from "./ui/scroll-area";
export { SearchInput, type SearchInputProps } from "./ui/search-input";
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "./ui/select";
export { Separator } from "./ui/separator";
export { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
export { Skeleton } from "./ui/skeleton";
export { Spinner, type SpinnerProps } from "./ui/spinner";
export { Stepper, type StepperProps, type StepperStep } from "./ui/stepper";
export { Switch } from "./ui/switch";
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
export { Textarea } from "./ui/textarea";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
export { DatePicker, type DatePickerProps } from "./ui/date-picker";
export { DateRangePicker, type DateRangePickerProps } from "./ui/date-range-picker";
export { OrderQRCode, type OrderData } from "./OrderQRCode";
