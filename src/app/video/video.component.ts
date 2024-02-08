import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {JsonPipe} from "@angular/common";

@Component({
  selector: 'app-video',
  standalone: true,
  imports: [
    JsonPipe
  ],
  templateUrl: './video.component.html',
  styleUrl: './video.component.scss'
})
export class VideoComponent implements AfterViewInit {
  width = 320;    // We will scale the photo width to this
  height = 0;     // This will be computed based on the input stream
  streaming = false;
  @Input()
  public stream!: MediaStream;
  @ViewChild("videoElement")
  videoElement!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    this.videoElement.nativeElement.addEventListener(
      "canplay",
      (ev) => {
        console.log("canplay");
        if (!this.streaming) {
          this.height = (this.videoElement.nativeElement.videoHeight / this.videoElement.nativeElement.videoWidth) * this.width;

          this.videoElement.nativeElement.setAttribute("width", this.width + "");
          this.videoElement.nativeElement.setAttribute("height", this.height + "");
          this.streaming = true;
        }
      },
      false,
    );
    this.videoElement.nativeElement.srcObject = this.stream;
    console.log("video play");
    this.videoElement.nativeElement.play();
  }
}
