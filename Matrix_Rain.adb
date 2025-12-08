--  Matrix_Rain.adb
--
--  Proper random seed every run
--  No leading-space escape bugs
--  Should terminal clean on exit (Ctrl+C)
--  Fixed timing with `delay until`
--  • Works on most terminals

with Ada.Text_IO;               use Ada.Text_IO;
with Ada.Numerics.Float_Random; use Ada.Numerics.Float_Random;
with Ada.Calendar;              use Ada.Calendar;
with Ada.Exceptions;

procedure Matrix_Rain is
   G          : Generator;
   Width      : constant Positive := 80;
   Height     : constant Positive := 24;  -- Standard terminal height

   type Drop is record
      Head       : Natural := 0;      -- 0 = inactive
      Length     : Positive := 20;
      Next_Start : Time := Clock;
   end record;

   Columns : array (1 .. Width) of Drop := (others => <>);

   -- Full_Chars : constant String :=
     "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" &
     "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ" &
     "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

   function Rand_Char return Character is
     (Full_Chars (Full_Chars'First +
        Integer (Random(G) * Float(Full_Chars'Length - 1))));

   -- Strip leading space from Integer'Image
   function Img (N : Integer) return String is
     (S : constant String := Integer'Image(N);
      Result : String renames S(S'First + 1 .. S'Last))
     return Result;

   Next_Frame : Time := Clock;
   Frame_Duration : constant Duration := 0.05;  -- 20 FPS

begin
   -- Proper unpredictable seed using clock fractions
   Reset(G, Initiator => Integer(Seconds(Clock)));

   -- Randomize all columns
   for C of Columns loop
      C.Length     := 12 + Integer(Random(G) * 28.0);  -- 12–40
      C.Next_Start := Clock + Duration(Random(G) * 3.5);
   end loop;

   -- Setup terminal
   Put (ASCII.ESC & "[2J" & ASCII.ESC & "[H");     -- Clear + home
   Put (ASCII.ESC & "[?25l");                      -- Hide cursor
   Put (ASCII.ESC & "[0m");                        -- Reset colors

   -- Main loop with proper timing
   loop
      Next_Frame := Next_Frame + Frame_Duration;
      delay until Next_Frame;

      for X in Columns'Range loop
         declare
            C : Drop renames Columns(X);
         begin
            -- Start new drop?
            if C.Head = 0 and then Clock >= C.Next_Start then
               C.Head := 1;
            end if;

            if C.Head > 0 then
               -- Draw column
               for Y in 1 .. Height loop
                  declare
                     Dist : constant Integer := Y - C.Head;
                  begin
                     Put (ASCII.ESC & '[' & Img(Y) & ';' & Img(X) & 'H');

                     if Dist = 0 then
                        -- Bright white head
                        Put (ASCII.ESC & "[97;1m" & Rand_Char);
                     elsif Dist > 0 and then Dist <= C.Length then
                        -- Fading green trail (real Matrix palette)
                        declare
                           Color : constant Integer := 46 + Dist * 5;  -- 46 → bright → 82 → lime → darker
                        begin
                           Put (ASCII.ESC & "[38;5;" & Img(Color) & "m" & Rand_Char);
                        end;
                     else
                        Put (' ');
                     end if;
                  end;
               end loop;

               C.Head := C.Head + 1;

               -- Drop finished?
               if C.Head > Height + C.Length then
                  C.Head := 0;
                  C.Next_Start := Clock + Duration(Random(G) * 6.0 + 1.0);
               end if;
            end if;
         end;
      end loop;
   end loop;

exception
   when E : others =>
      -- Always restore terminal on crash or Ctrl+C
      Put (ASCII.ESC & "[0m" & ASCII.ESC & "[?25h" & ASCII.ESC & "[2J");
      New_Line;
      Put_Line ("Matrix rain terminated: " & Ada.Exceptions.Exception_Message(E));
end Matrix_Rain;
