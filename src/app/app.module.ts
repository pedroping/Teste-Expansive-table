import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { InfiniteTableDirective } from './directives/infinite-table.directive';
import { MyTableComponent } from './my-table/my-table.component';

@NgModule({
  declarations: [AppComponent, InfiniteTableDirective, MyTableComponent],
  imports: [BrowserModule, BrowserAnimationsModule, ScrollingModule, MatTableModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
